// Members routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const membersData = require('../data/members');
const { getDatabase, isUniqueConstraintError } = require('../db/connection');

const router = express.Router();
const HOLD_FEE_PER_DAY = parseFloat(process.env.HOLD_FEE_PER_DAY) || 0.71;
const MAX_HOLD_DAYS = parseInt(process.env.MAX_HOLD_DAYS, 10) || 84;

// Get all members (with filters and pagination)
router.get('/', authenticateToken, requirePermission('members:read'), auditLog('view_list', 'member'), (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      location: req.query.location,
      query: req.query.query,
      limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100),
      offset: Math.max(parseInt(req.query.offset, 10) || 0, 0)
    };

    const result = membersData.getAllMembers(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get member stats
router.get('/stats', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const stats = membersData.getMemberStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching member stats:', error);
    res.status(500).json({ error: 'Failed to fetch member stats' });
  }
});

// Bulk export members as CSV
router.post('/bulk/export', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 members per export' });

    const members = ids.map(id => membersData.getMemberById(id)).filter(Boolean);
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plan', 'Location', 'Joined'];
    const rows = members.map(m => [m.first_name, m.last_name, m.email, m.phone, m.status, m.plan, m.location, m.joined_date].map(v => `"${v || ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting members:', error);
    res.status(500).json({ error: 'Failed to export members' });
  }
});

// Bulk status change
router.post('/bulk/status', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (!['active', 'paused', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status, must be active, paused, or cancelled' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 members per operation' });

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const member = membersData.getMemberById(id);
        if (!member) { errors.push({ id, error: 'Member not found' }); continue; }
        const updateData = { status };
        if (status === 'cancelled') updateData.cancellation_date = new Date().toISOString().split('T')[0];
        if (status !== 'paused') { updateData.pause_start = null; updateData.pause_end = null; }
        results.push(membersData.updateMember(id, updateData));
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({ updated: results.length, errors, members: results });
  } catch (error) {
    console.error('Error bulk updating status:', error);
    res.status(500).json({ error: 'Failed to update member status' });
  }
});

// Bulk queue messages
router.post('/bulk/message', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { ids, message, channel } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (!message) return res.status(400).json({ error: 'message body required' });
    if (!['email', 'sms'].includes(channel)) return res.status(400).json({ error: 'channel must be email or sms' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 members per operation' });

    const scheduledMessagesData = require('../data/scheduledMessages');
    const queued = [];
    const errors = [];

    for (const id of ids) {
      try {
        const member = membersData.getMemberById(id);
        if (!member) { errors.push({ id, error: 'Member not found' }); continue; }

        const msgData = {
          member_id: id,
          message_type: channel,
          scheduled_for: new Date().toISOString(),
          body: message,
          status: 'pending'
        };

        if (channel === 'email') msgData.recipient_email = member.email;
        if (channel === 'sms') msgData.recipient_phone = member.phone;

        if (!msgData.recipient_email && !msgData.recipient_phone) {
          errors.push({ id, error: `Member has no ${channel} contact` });
          continue;
        }

        queued.push(scheduledMessagesData.createScheduledMessage(msgData));
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    res.status(201).json({ queued: queued.length, errors, messages: queued });
  } catch (error) {
    console.error('Error queuing bulk messages:', error);
    res.status(500).json({ error: 'Failed to queue messages' });
  }
});

// Bulk delete (archive) members
router.post('/bulk-delete', authenticateToken, requirePermission('members:delete'), (req, res) => {
  try {
    const { ids, confirm } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 members per operation' });
    if (!confirm) return res.status(400).json({ error: 'confirm: true required for bulk delete' });

    const results = []; const errors = [];
    for (const id of ids) {
      try {
        const member = membersData.getMemberById(id);
        if (!member) { errors.push({ id, error: 'Member not found' }); continue; }
        membersData.updateMember(id, { status: 'archived', archived_at: new Date().toISOString() });
        results.push(id);
      } catch (err) { errors.push({ id, error: err.message }); }
    }
    res.json({ deleted: results.length, errors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete members' });
  }
});

// Bulk update members
router.post('/bulk-update', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object required' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 members per operation' });

    const allowed = ['status', 'plan', 'location', 'membership_type', 'notes', 'experience_level', 'emergency_contact_name', 'emergency_contact_phone'];
    const updateData = {};
    allowed.forEach(f => { if (data[f] !== undefined) updateData[f] = data[f]; });
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const results = []; const errors = [];
    for (const id of ids) {
      try {
        const member = membersData.getMemberById(id);
        if (!member) { errors.push({ id, error: 'Member not found' }); continue; }
        results.push(membersData.updateMember(id, { ...updateData }));
      } catch (err) { errors.push({ id, error: err.message }); }
    }
    res.json({ updated: results.length, errors, members: results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update members' });
  }
});

// Get single member by ID
router.get('/:id', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Add waiver signed status
    const db = getDatabase();
    const waiverRecord = db.prepare("SELECT id, signed_at, template_id FROM member_waivers WHERE member_id = ? ORDER BY signed_at DESC LIMIT 1").get(req.params.id);
    member.waiver_signed = !!waiverRecord;

    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Get member attendance history
router.get('/:id/attendance', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const attendance = membersData.getMemberAttendance(req.params.id, limit);
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching member attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get member attendance stats (streak + heatmap)
router.get('/:id/attendance-stats', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const db = getDatabase();
    const id = req.params.id;

    // All attendance dates ordered desc
    const attendedDates = db.prepare(`
      SELECT DISTINCT ci.date FROM bookings b
      JOIN class_instances ci ON b.class_instance_id = ci.id
      WHERE b.member_id = ? AND b.status = 'attended'
      ORDER BY ci.date DESC
    `).all(id).map(r => r.date);

    // Current streak (consecutive days backwards from today)
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const checkDate = new Date(today);
    const attendedSet = new Set(attendedDates);
    for (let i = 0; i < 365; i++) {
      const ds = checkDate.toISOString().split('T')[0];
      if (attendedSet.has(ds)) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (i === 0) { /* didn't attend today, check yesterday */ checkDate.setDate(checkDate.getDate() - 1); continue; }
      else break;
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedAsc = [...attendedDates].sort();
    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) { tempStreak = 1; }
      else {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diff = (curr - prev) / 86400000;
        if (diff === 1) tempStreak++;
        else { longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 1; }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Total attendance
    const totalAttendance = attendedDates.length;

    // This month
    const monthStart = new Date(); monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const thisMonth = attendedDates.filter(d => d >= monthStartStr).length;

    // Heatmap data: last 12 weeks (84 days)
    const heatmapDays = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      heatmapDays.push({ date: ds, day: d.getDay(), attended: attendedSet.has(ds) });
    }

    res.json({
      currentStreak,
      longestStreak,
      totalAttendance,
      thisMonth,
      heatmap: heatmapDays
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Failed to fetch attendance stats' });
  }
});

// Get member transaction history
router.get('/:id/transactions', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const transactions = membersData.getMemberTransactions(req.params.id, limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching member transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create new member
router.post('/', authenticateToken, requirePermission('members:create'), auditLog('create', 'member'), (req, res) => {
  try {
    const { first_name, last_name, email, phone, location, joined_date } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !location || !joined_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existingMember = membersData.getMemberByEmail(email);
    if (existingMember) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Calculate trial end date (next Monday after 7 days from joined_date)
    const joinedDate = new Date(joined_date);
    const trialEndDate = new Date(joinedDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Find next Monday
    while (trialEndDate.getDay() !== 1) {
      trialEndDate.setDate(trialEndDate.getDate() + 1);
    }

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'location', 'plan', 'emergency_contact_name', 'emergency_contact_phone', 'medical_conditions', 'injuries', 'goals', 'experience_level', 'source', 'notes'];
    const memberData = { trial_end_date: trialEndDate.toISOString().split('T')[0] };
    allowedFields.forEach(f => { if (req.body[f] !== undefined) memberData[f] = req.body[f]; });

    const member = membersData.createMember(memberData);

    // Notify staff of new member
    try {
      const notifService = require('../services/notificationService');
      notifService.broadcast('member_created', `New member: ${member.first_name} ${member.last_name}`,
        `${member.first_name} ${member.last_name} joined as ${member.plan || 'member'}`, '/members');
    } catch (e) {}

    // Auto-trigger parent waiver email for under-18 members
    if (member.date_of_birth) {
      const birthDate = new Date(member.date_of_birth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 86400000));
      if (age < 18 && member.email) {
        const db = require('../db/connection').getDatabase();
        const template = db.prepare("SELECT id FROM waiver_templates WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
        if (template) {
          db.prepare(`INSERT INTO event_queue (event_type, payload, status, created_at) VALUES ('SEND_PARENT_WAIVER', ?, 'pending', datetime('now'))`)
            .run(JSON.stringify({ member_id: member.id, parent_email: member.email, template_id: template.id }));
        }
      }
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating member:', error);

    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Update member
router.put('/:id', authenticateToken, requirePermission('members:update'), auditLog('update', 'member'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // If updating email, check for duplicates
    if (req.body.email && req.body.email !== member.email) {
      const existingMember = membersData.getMemberByEmail(req.body.email);
      if (existingMember) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'location', 'status', 'plan', 'trial_end_date', 'pause_start', 'pause_end', 'cancellation_date', 'emergency_contact_name', 'emergency_contact_phone', 'medical_conditions', 'injuries', 'goals', 'experience_level', 'lightspeed_customer_id', 'notes', 'parent_id', 'is_fighter', 'membership_type', 'gender', 'address', 'suburb', 'postcode'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const updatedMember = membersData.updateMember(req.params.id, updateData);

    // Auto-trigger parent waiver if DOB changed to under-18
    if (req.body.date_of_birth) {
      const birthDate = new Date(req.body.date_of_birth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 86400000));
      if (age < 18) {
        const db = require('../db/connection').getDatabase();
        const existingWaiver = db.prepare("SELECT id FROM member_waivers WHERE member_id = ? ORDER BY signed_at DESC LIMIT 1").get(req.params.id);
        const pendingExists = db.prepare("SELECT id FROM pending_parent_signatures WHERE member_id = ? AND status = 'pending' LIMIT 1").get(req.params.id);
        if (!existingWaiver && !pendingExists) {
          const template = db.prepare("SELECT id FROM waiver_templates WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
          if (template) {
            db.prepare(`INSERT INTO event_queue (event_type, payload, status, created_at) VALUES ('SEND_PARENT_WAIVER', ?, 'pending', datetime('now'))`)
              .run(JSON.stringify({ member_id: parseInt(req.params.id, 10), parent_email: updatedMember.email, template_id: template.id }));
          }
        }
      }
    }

    res.json(updatedMember);
  } catch (error) {
    console.error('Error updating member:', error);

    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Pause membership
router.post('/:id/pause', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { pause_start, pause_end } = req.body;

    if (!pause_start || !pause_end) {
      return res.status(400).json({ error: 'Pause start and end dates required' });
    }

    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.status !== 'active') {
      return res.status(400).json({ error: 'Only active members can be paused' });
    }

    // Validate pause period
    const startDate = new Date(pause_start);
    const endDate = new Date(pause_end);

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Pause end date must be after start date' });
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (days > MAX_HOLD_DAYS) {
      return res.status(400).json({ error: `Maximum hold period is ${MAX_HOLD_DAYS} days` });
    }

    const holdFee = +(days * HOLD_FEE_PER_DAY).toFixed(2);

    const updatedMember = membersData.updateMember(req.params.id, {
      status: 'paused',
      pause_start,
      pause_end
    });

    res.json({
      member: updatedMember,
      hold_fee: holdFee,
      days: days
    });
  } catch (error) {
    console.error('Error pausing membership:', error);
    res.status(500).json({ error: 'Failed to pause membership' });
  }
});

// Resume membership
router.post('/:id/resume', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.status !== 'paused') {
      return res.status(400).json({ error: 'Member is not paused' });
    }

    const updatedMember = membersData.updateMember(req.params.id, {
      status: 'active',
      pause_start: null,
      pause_end: null
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Error resuming membership:', error);
    res.status(500).json({ error: 'Failed to resume membership' });
  }
});

// Cancel membership
router.post('/:id/cancel', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const update = {
      status: 'cancelled',
      cancellation_date: new Date().toISOString().split('T')[0]
    };
    if (req.body.cancellation_reason) update.cancellation_reason = req.body.cancellation_reason;
    if (req.body.winback_eligible !== undefined) update.winback_eligible = req.body.winback_eligible ? 1 : 0;

    const updatedMember = membersData.updateMember(req.params.id, update);

    res.json(updatedMember);
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ error: 'Failed to cancel membership' });
  }
});

// Delete (archive) member
router.delete('/:id', authenticateToken, requirePermission('members:delete'), auditLog('delete', 'member'), (req, res) => {
  try {
    const member = membersData.getMemberById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    membersData.updateMember(req.params.id, { status: 'archived', archived_at: new Date().toISOString() });
    res.json({ message: 'Member archived' });
  } catch (error) {
    console.error('Error archiving member:', error);
    res.status(500).json({ error: 'Failed to archive member' });
  }
});

// Get member disciplines/belts
router.get('/:id/disciplines', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const disciplines = membersData.getMemberDisciplines(req.params.id);
    res.json(disciplines);
  } catch (error) {
    console.error('Error fetching member disciplines:', error);
    res.status(500).json({ error: 'Failed to fetch disciplines' });
  }
});

// Assign belt for a discipline
router.post('/:id/assign-belt', authenticateToken, requirePermission('grading:write'), (req, res) => {
  try {
    const { discipline, belt_level_id } = req.body;
    if (!discipline || !belt_level_id) {
      return res.status(400).json({ error: 'Discipline and belt_level_id required' });
    }
    const result = membersData.assignDisciplineBelt(req.params.id, discipline, belt_level_id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error assigning belt:', error);
    res.status(500).json({ error: 'Failed to assign belt' });
  }
});

// Get member notes/timeline
router.get('/:id/notes', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const notes = membersData.getMemberNotes(req.params.id);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Add member note
router.post('/:id/notes', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { note_type, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const note = membersData.addMemberNote(req.params.id, req.user.id, note_type || 'general', content);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get enrolled classes this week
router.get('/:id/enrolled-classes', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const classes = membersData.getMemberEnrolledClasses(req.params.id);
    res.json(classes);
  } catch (error) {
    console.error('Error fetching enrolled classes:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled classes' });
  }
});

// Change membership plan
router.post('/:id/change-plan', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { plan, effective_date } = req.body;
    if (!plan) return res.status(400).json({ error: 'Plan required' });
    const member = membersData.changeMemberPlan(req.params.id, plan, effective_date || new Date().toISOString().split('T')[0]);
    res.json(member);
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: error.message || 'Failed to change plan' });
  }
});

// Get PT sessions
router.get('/:id/pt-sessions', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const sessions = membersData.getMemberPtSessions(req.params.id);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching PT sessions:', error);
    res.status(500).json({ error: 'Failed to fetch PT sessions' });
  }
});

// Get competition history
router.get('/:id/competitions', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const comps = membersData.getMemberCompetitions(req.params.id);
    res.json(comps);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

// Add competition result
router.post('/:id/competitions', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { event_name, event_date } = req.body;
    if (!event_name || !event_date) return res.status(400).json({ error: 'Event name and date required' });
    const comp = membersData.addMemberCompetition(req.params.id, req.body);
    res.status(201).json(comp);
  } catch (error) {
    console.error('Error adding competition:', error);
    res.status(500).json({ error: 'Failed to add competition' });
  }
});

// Get referrals
router.get('/:id/referrals', authenticateToken, requirePermission('members:read'), (req, res) => {
  try {
    const referrals = membersData.getMemberReferrals(req.params.id);
    res.json(referrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// Add referral
router.post('/:id/referrals', authenticateToken, requirePermission('members:update'), (req, res) => {
  try {
    const { referred_member_id, voucher_value } = req.body;
    if (!referred_member_id) return res.status(400).json({ error: 'Referred member ID required' });
    const referral = membersData.addMemberReferral(req.params.id, referred_member_id, voucher_value);
    res.status(201).json(referral);
  } catch (error) {
    console.error('Error adding referral:', error);
    res.status(500).json({ error: 'Failed to add referral' });
  }
});

// Bulk import members from JSON array (frontend parses CSV)
router.post('/bulk/import', authenticateToken, requirePermission('members:create'), (req, res) => {
  try {
    const { members: rawMembers } = req.body;
    if (!Array.isArray(rawMembers) || rawMembers.length === 0) return res.status(400).json({ error: 'members array is required' });
    if (rawMembers.length > 500) return res.status(400).json({ error: 'Maximum 500 members per import' });

    const imported = [];
    const errors = [];
    const fieldMap = {
      first_name: ['first_name', 'firstname', 'first', 'givenname', 'given_name', 'fname'],
      last_name: ['last_name', 'lastname', 'last', 'surname', 'family_name', 'lname'],
      email: ['email', 'e-mail', 'email_address', 'emailaddress', 'mail'],
      phone: ['phone', 'telephone', 'mobile', 'phone_number', 'phonenumber', 'tel', 'cell'],
      location: ['location', 'branch', 'gym', 'site'],
      plan: ['plan', 'membership', 'membership_type', 'membershiptype'],
      status: ['status', 'member_status'],
      notes: ['notes', 'comment', 'comments'],
      date_of_birth: ['date_of_birth', 'dob', 'birthdate', 'birth_date'],
      emergency_contact_name: ['emergency_contact_name', 'emergencyname', 'emergency_contact'],
      emergency_contact_phone: ['emergency_contact_phone', 'emergencyphone', 'emergency_phone'],
      joined_date: ['joined_date', 'joined', 'start_date', 'joindate', 'membership_date'],
    };

    function mapRow(row) {
      const mapped = {};
      for (const [field, aliases] of Object.entries(fieldMap)) {
        for (const alias of aliases) {
          const val = row[alias] || row[alias.toLowerCase()];
          if (val && val.trim()) { mapped[field] = val.trim(); break; }
        }
      }
      return mapped;
    }

    for (let i = 0; i < rawMembers.length; i++) {
      try {
        const row = mapRow(rawMembers[i]);
        if (!row.first_name || !row.last_name) {
          errors.push({ row: i + 1, error: 'Missing required field: first_name and last_name are required' });
          continue;
        }
        const email = row.email || null;
        if (email) {
          const existing = membersData.getMemberByEmail(email);
          if (existing) {
            errors.push({ row: i + 1, error: `Duplicate email: ${email}`, member: existing });
            continue;
          }
        }
        const member = membersData.createMember({
          first_name: row.first_name,
          last_name: row.last_name,
          email: email,
          phone: row.phone || null,
          location: row.location || 'rockingham',
          plan: row.plan || null,
          status: row.status || 'active',
          notes: row.notes || null,
          date_of_birth: row.date_of_birth || null,
          emergency_contact_name: row.emergency_contact_name || null,
          emergency_contact_phone: row.emergency_contact_phone || null,
          joined_date: row.joined_date || new Date().toISOString().split('T')[0],
        });
        imported.push(member);
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    res.status(201).json({ imported: imported.length, errors, members: imported });
  } catch (error) {
    console.error('Error importing members:', error);
    res.status(500).json({ error: 'Failed to import members' });
  }
});

module.exports = router;
