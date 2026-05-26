// Leads routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const leadsData = require('../data/leads');
const messageScheduler = require('../services/messageScheduler');

const router = express.Router();

// Get all leads (with filters)
router.get('/', authenticateToken, requirePermission('leads:read'), (req, res) => {
  try {
    const filters = {
      stage: req.query.stage,
      location: req.query.location,
      source: req.query.source,
      assigned_to: req.query.assigned_to,
      query: req.query.query
    };

    const leads = leadsData.getAllLeads(filters);
    res.json(leads);
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
router.post('/', authenticateToken, requirePermission('leads:create'), (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({ error: 'first_name, last_name, and phone required' });
    }

    const lead = leadsData.createLead(req.body);

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

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticateToken, requirePermission('leads:update'), (req, res) => {
  try {
    const lead = leadsData.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedLead = leadsData.updateLead(req.params.id, req.body);

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

    // This would typically create a member and link it
    // For now, just update the stage
    const updatedLead = leadsData.updateLead(req.params.id, {
      stage: 'converted'
    });

    res.json(updatedLead);
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

// Delete lead
router.delete('/:id', authenticateToken, requirePermission('leads:delete'), (req, res) => {
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
