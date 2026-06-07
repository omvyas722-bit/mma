// Scheduled messages routes
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const scheduledMessagesData = require('../data/scheduledMessages');
const { getDatabase } = require('../db/connection');

const router = express.Router();

// Ensure uploads/comms directory + message_attachments table
const commsDir = path.join(__dirname, '..', 'uploads', 'comms');
if (!fs.existsSync(commsDir)) fs.mkdirSync(commsDir, { recursive: true });

const attStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, commsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});
const fileUpload = multer({
  storage: attStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function ensureAttachmentsTable() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS message_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduled_message_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (scheduled_message_id) REFERENCES scheduled_messages(id) ON DELETE CASCADE
  )`);
}

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

// Create scheduled message (supports multipart with file attachments)
router.post('/', authenticateToken, requirePermission('communications:write'), fileUpload.array('files', 5), (req, res) => {
  try {
    const {
      lead_id, member_id, message_type, template_id, scheduled_for,
      recipient_phone, recipient_email, subject, body, recipient_group, member_ids
    } = req.body;

    if (!message_type || !scheduled_for || !body) {
      return res.status(400).json({ error: 'message_type, scheduled_for, and body required' });
    }

    const totalSize = (req.files || []).reduce((s, f) => s + f.size, 0);
    if (totalSize > 10 * 1024 * 1024) return res.status(400).json({ error: 'Total file size exceeds 10MB' });

    const message = scheduledMessagesData.createScheduledMessage({
      lead_id: lead_id || null,
      member_id: member_id || null,
      message_type,
      template_id: template_id || null,
      scheduled_for,
      recipient_phone: recipient_phone || null,
      recipient_email: recipient_email || null,
      subject: subject || null,
      body
    });

    // Store file attachments if any
    if (req.files && req.files.length > 0) {
      ensureAttachmentsTable();
      const db = getDatabase();
      const stmt = db.prepare(`INSERT INTO message_attachments (scheduled_message_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)`);
      for (const f of req.files) {
        stmt.run(message.id, f.filename, f.originalname, f.mimetype, f.size);
      }
    }

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
