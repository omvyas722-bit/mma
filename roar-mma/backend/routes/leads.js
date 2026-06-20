// Leads routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const leadsData = require('../data/leads');
const messageScheduler = require('../services/messageScheduler');

const router = express.Router();

// Get all leads (with filters)
router.get('/', authenticateToken, requirePermission('leads:read'), auditLog('view_list', 'lead'), (req, res) => {
  try {
    const filters = {
      stage: req.query.stage,
      location: req.query.location,
      source: req.query.source,
      assigned_to: req.query.assigned_to,
      query: req.query.query,
      limit: req.query.limit,
      offset: req.query.offset
    };

    const result = leadsData.getAllLeads(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead stats
router.get('/stats', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const stats = leadsData.getLeadStats();
    const bySource = leadsData.getLeadsBySource();
    const conversionRate = leadsData.getConversionRate();

    res.json({
      ...stats,
      by_source: bySource,
      conversion_rate: parseFloat(conversionRate)
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({ error: 'Failed to fetch lead stats' });
  }
});

// Get win-back candidates (lost leads inactive 14+ days)
router.get('/winback', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const leads = leadsData.getWinBackLeads();
    res.json({ leads });
  } catch (error) {
    console.error('Error fetching win-back leads:', error);
    res.status(500).json({ error: 'Failed to fetch win-back leads' });
  }
});

// Bulk export leads as CSV
router.post('/bulk/export', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 leads per export' });

    const leads = ids.map(id => leadsData.getLeadById(id)).filter(Boolean);
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Stage', 'Location', 'Created'];
    const rows = leads.map(l => [l.first_name, l.last_name, l.email, l.phone, l.source, l.stage, l.location, l.created_at].map(v => `"${v || ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Bulk delete leads
router.post('/bulk/delete', authenticateToken, requirePermission('leads:delete'), (req, res) => {
  try {
    const { ids, confirm } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (!confirm) return res.status(400).json({ error: 'Confirmation required, set confirm: true' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 leads per operation' });

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const lead = leadsData.getLeadById(id);
        if (!lead) { errors.push({ id, error: 'Lead not found' }); continue; }
        leadsData.deleteLead(id);
        results.push(id);
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({ deleted: results.length, errors });
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    res.status(500).json({ error: 'Failed to delete leads' });
  }
});

// Bulk update leads
router.post('/bulk-update', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object required' });
    if (ids.length > 500) return res.status(400).json({ error: 'Maximum 500 leads per operation' });

    const allowed = ['stage', 'source', 'location', 'interest_level', 'assigned_to', 'notes'];
    const updateData = {};
    allowed.forEach(f => { if (data[f] !== undefined) updateData[f] = data[f]; });
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const results = []; const errors = [];
    for (const id of ids) {
      try {
        const lead = leadsData.getLeadById(id);
        if (!lead) { errors.push({ id, error: 'Lead not found' }); continue; }
        results.push(leadsData.updateLead(id, { ...updateData }));
      } catch (err) { errors.push({ id, error: err.message }); }
    }
    res.json({ updated: results.length, errors, leads: results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update leads' });
  }
});

// Get single lead by ID
router.get('/:id', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Get lead interactions
router.get('/:id/interactions', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const interactions = leadsData.getLeadInteractions(req.params.id);
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching lead interactions:', error);
    res.status(500).json({ error: 'Failed to fetch lead interactions' });
  }
});

// Create new lead
router.post('/', authenticateToken, requirePermission('leads:create'), auditLog('create', 'lead'), (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({ error: 'first_name, last_name, and phone required' });
    }

      const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'source', 'location', 'interests', 'notes', 'assigned_to', 'utm_source', 'utm_medium', 'utm_campaign'];
      const leadData = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedFields.includes(key)) {
          leadData[key] = value;
        }
      }

    const lead = leadsData.createLead(leadData);

    // Schedule instant response SMS (within 2 minutes)
    try {
      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + 2);

      const messageTemplatesData = require('../data/messageTemplates');
      const templates = messageTemplatesData.getAllTemplates({
        trigger_event: 'lead_new',
        type: 'sms',
        active: 1
      });

      if (templates.length > 0) {
        const template = templates[0];
        const scheduledMessagesData = require('../data/scheduledMessages');

        scheduledMessagesData.createScheduledMessage({
          lead_id: lead.id,
          message_type: 'sms',
          template_id: template.id,
          scheduled_for: scheduledFor.toISOString(),
          recipient_phone: lead.phone,
          body: template.body
        });

        console.log(`✓ Instant response SMS scheduled for lead ${lead.id}`);
      }
    } catch (err) {
      console.error('Failed to schedule instant response:', err);
      // Don't fail lead creation if scheduling fails
    }

    // Notify staff of new lead
    try {
      const notifService = require('../services/notificationService');
      notifService.broadcast('new_lead', `New lead: ${lead.first_name} ${lead.last_name}`,
        `${lead.first_name} ${lead.last_name} - ${lead.source || 'unknown source'}`, '/leads');
    } catch (e) {}

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticateToken, requirePermission('leads:update'), auditLog('update', 'lead'), (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'source', 'location', 'interests', 'notes', 'assigned_to'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const updatedLead = leadsData.updateLead(req.params.id, updateData);

    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Add interaction to lead
router.post('/:id/interactions', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const { interaction_type, notes } = req.body;

    if (!interaction_type) {
      return res.status(400).json({ error: 'interaction_type required' });
    }

    const validTypes = ['call', 'email', 'sms', 'in_person', 'note'];
    if (!validTypes.includes(interaction_type)) {
      return res.status(400).json({ error: 'Invalid interaction_type' });
    }

    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const interaction = leadsData.addLeadInteraction({
      lead_id: req.params.id,
      staff_id: req.user.id,
      interaction_type,
      notes
    });

    res.status(201).json(interaction);
  } catch (error) {
    console.error('Error adding lead interaction:', error);
    res.status(500).json({ error: 'Failed to add lead interaction' });
  }
});

// Convert lead to member
router.post('/:id/convert', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.stage === 'converted') {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    const membersData = require('../data/members');
    const member = membersData.createMember({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      location: lead.location || null,
      source: 'lead_conversion',
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
      notes: lead.notes ? `Converted from lead #${lead.id}: ${lead.notes}` : `Converted from lead #${lead.id}`
    });

    const updatedLead = leadsData.updateLead(req.params.id, {
      stage: 'converted',
      converted_to_member_id: member.id
    });

    res.json({ lead: updatedLead, member });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Mark lead as lost
router.post('/:id/lost', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const { lost_reason } = req.body;

    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedLead = leadsData.updateLead(req.params.id, {
      stage: 'lost',
      lost_reason: lost_reason || 'No reason provided'
    });

    res.json(updatedLead);
  } catch (error) {
    console.error('Error marking lead as lost:', error);
    res.status(500).json({ error: 'Failed to mark lead as lost' });
  }
});

// Schedule trial follow-ups
router.post('/schedule-trial-followups', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const { lead_id, trial_date } = req.body;

    if (!lead_id || !trial_date) {
      return res.status(400).json({ error: 'lead_id and trial_date required' });
    }

    const lead = leadsData.getLeadById(lead_id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Schedule automated follow-ups
    const scheduledMessages = messageScheduler.scheduleTrialFollowUps(lead_id, trial_date);

    res.json({
      message: 'Trial follow-ups scheduled successfully',
      scheduled_count: scheduledMessages.length,
      messages: scheduledMessages
    });
  } catch (error) {
    console.error('Error scheduling trial follow-ups:', error);
    res.status(500).json({ error: 'Failed to schedule trial follow-ups' });
  }
});

// Bulk import leads (JSON array from CSV parsing on frontend)
router.post('/import', authenticateToken, requirePermission('leads:create'), (req, res) => {
  try {
    const { leads: rawLeads } = req.body;
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) return res.status(400).json({ error: 'leads array is required' });
    if (rawLeads.length > 500) return res.status(400).json({ error: 'Maximum 500 leads per import' });

    const imported = [];
    const errors = [];
    const fieldMap = {
      first_name: ['first_name', 'firstname', 'first', 'givenname', 'given_name', 'fname'],
      last_name: ['last_name', 'lastname', 'last', 'surname', 'family_name', 'lname'],
      email: ['email', 'e-mail', 'email_address', 'emailaddress'],
      phone: ['phone', 'telephone', 'mobile', 'phone_number', 'phonenumber', 'tel', 'cell'],
      source: ['source', 'lead_source', 'leadsource', 'origin'],
      notes: ['notes', 'comments', 'description', 'note'],
      interest_level: ['interest_level', 'interest', 'level'],
      location: ['location', 'branch', 'gym', 'site'],
      status: ['status', 'stage'],
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

    for (let i = 0; i < rawLeads.length; i++) {
      try {
        const row = mapRow(rawLeads[i]);
        if (!row.first_name && !row.email && !row.phone) {
          errors.push({ row: i + 1, error: 'Missing required field (first_name, email, or phone)' });
          continue;
        }
        const lead = leadsData.createLead({
          first_name: row.first_name || 'Unknown',
          last_name: row.last_name || '',
          email: row.email || null,
          phone: row.phone || null,
          source: row.source || 'csv_import',
          notes: row.notes || null,
          interest_level: row.interest_level || null,
          location: row.location || null,
          stage: row.status || 'new',
        });
        imported.push(lead);
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    res.status(201).json({ imported: imported.length, errors, leads: imported });
  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// AI enrichment for a lead (SCOUT on-demand research)
router.post('/:id/enrich', authenticateToken, requirePermission('leads:update'), async (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const providerChain = require('../services/ai/providerChain');
    const prompt = `Given this lead info, provide a brief research analysis:
Name: ${lead.first_name || ''} ${lead.last_name || ''}
Email: ${lead.email || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'N/A'}
Interests: ${lead.interests || 'N/A'}

Return a JSON object with: interests_analysis (2-3 sentences), recommended_approach (2-3 sentences), best_class_to_offer, suggested_discount_tier (none/low/medium/high), and communication_tone (friendly/professional/enthusiastic).`;

    const aiResult = await providerChain.completeChat(
      [{ role: 'user', content: prompt }],
      { jsonMode: true, temperature: 0.4, maxTokens: 500 }
    );

    let enrichment = null;
    if (aiResult.content) {
      try { enrichment = JSON.parse(aiResult.content); } catch {}
    }

    res.json({ lead_id: lead.id, enrichment });
  } catch (error) {
    console.error('Error enriching lead:', error);
    res.status(500).json({ error: 'Failed to enrich lead' });
  }
});

// Delete lead
router.delete('/:id', authenticateToken, requirePermission('leads:delete'), auditLog('delete', 'lead'), (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    leadsData.deleteLead(req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
