// Scheduled messages routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const scheduledMessagesData = require('../data/scheduledMessages');

const router = express.Router();

// Get all scheduled messages
router.get('/', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      message_type: req.query.message_type,
      lead_id: req.query.lead_id,
      member_id: req.query.member_id
    };

    const messages = scheduledMessagesData.getAllScheduledMessages(filters);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
});

// Get single scheduled message
router.get('/:id', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const message = scheduledMessagesData.getScheduledMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Scheduled message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error fetching scheduled message:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled message' });
  }
});

// Create scheduled message
router.post('/', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    const {
      lead_id, member_id, message_type, template_id, scheduled_for,
      recipient_phone, recipient_email, subject, body
    } = req.body;

    if (!message_type || !scheduled_for || !body) {
      return res.status(400).json({ error: 'message_type, scheduled_for, and body required' });
    }

    if (!lead_id && !member_id) {
      return res.status(400).json({ error: 'Either lead_id or member_id required' });
    }

    const message = scheduledMessagesData.createScheduledMessage({
      lead_id,
      member_id,
      message_type,
      template_id,
      scheduled_for,
      recipient_phone,
      recipient_email,
      subject,
      body
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating scheduled message:', error);
    res.status(500).json({ error: 'Failed to create scheduled message' });
  }
});

// Cancel scheduled message
router.post('/:id/cancel', authenticateToken, requirePermission('communications:write'), (req, res) => {
  try {
    const message = scheduledMessagesData.getScheduledMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Scheduled message not found' });
    }

    if (message.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending messages' });
    }

    const cancelled = scheduledMessagesData.cancelScheduledMessage(req.params.id);

    res.json(cancelled);
  } catch (error) {
    console.error('Error cancelling scheduled message:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled message' });
  }
});

// Get pending messages (for scheduler)
router.get('/pending/due', authenticateToken, requirePermission('communications:read'), (req, res) => {
  try {
    const beforeTime = req.query.before_time;
    const messages = scheduledMessagesData.getPendingMessages(beforeTime);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    res.status(500).json({ error: 'Failed to fetch pending messages' });
  }
});

module.exports = router;
