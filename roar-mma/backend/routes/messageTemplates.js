// Message templates routes
const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const templatesData = require('../data/messageTemplates');

const router = express.Router();

// Get all templates
router.get('/', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      trigger_event: req.query.trigger_event,
      active: req.query.active
    };

    const templates = templatesData.getAllTemplates(filters);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authenticateToken, requirePermission('settings:read'), (req, res) => {
  try {
    const template = templatesData.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const { name, type, trigger_event, subject, body, active } = req.body;

    if (!name || !type || !trigger_event || !body) {
      return res.status(400).json({ error: 'name, type, trigger_event, and body required' });
    }

    const template = templatesData.createTemplate({
      name,
      type,
      trigger_event,
      subject,
      body,
      active
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const template = templatesData.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const allowedFields = ['name', 'type', 'trigger_event', 'subject', 'body', 'active'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const updatedTemplate = templatesData.updateTemplate(req.params.id, updateData);

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const deleted = templatesData.deleteTemplate(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
