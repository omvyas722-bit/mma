// Staff management routes
const express = require('express');
const bcrypt = require('bcrypt');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const staffData = require('../data/staff');

const router = express.Router();

// Get all staff
router.get('/', authenticateToken, requirePermission('staff:read'), auditLog('view_list', 'staff'), (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      active: req.query.active
    };

    const staff = staffData.getAllStaff(filters);
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Get staff stats
router.get('/stats', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const stats = staffData.getStaffStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching staff stats:', error);
    res.status(500).json({ error: 'Failed to fetch staff stats' });
  }
});

// Get single staff member by ID
router.get('/:id', authenticateToken, requirePermission('staff:read'), (req, res) => {
  try {
    const staff = staffData.getStaffById(req.params.id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

// Create new staff member
router.post('/', authenticateToken, requirePermission('staff:create'), auditLog('create', 'staff'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role required' });
    }

    // Validate role
    const validRoles = ['owner', 'gm', 'front_desk', 'coach', 'sales', 'social'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existingStaff = staffData.getStaffByEmail(email);
    if (existingStaff) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const staff = staffData.createStaff({
      name,
      email,
      password_hash: passwordHash,
      role,
      phone
    });

    res.status(201).json(staff);
  } catch (error) {
    console.error('Error creating staff member:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// Update staff member
router.put('/:id', authenticateToken, requirePermission('staff:update'), auditLog('update', 'staff'), (req, res) => {
  try {
    const staff = staffData.getStaffById(req.params.id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // If updating email, check for duplicates
    if (req.body.email && req.body.email !== staff.email) {
      const existingStaff = staffData.getStaffByEmail(req.body.email);
      if (existingStaff) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    const allowedFields = ['name', 'email', 'role', 'phone', 'active'];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    const updatedStaff = staffData.updateStaff(req.params.id, updateData);

    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff member:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Update staff password
router.post('/:id/password', authenticateToken, requirePermission('staff:update'), async (req, res) => {
  try {
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'new_password required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Password strength: require at least one uppercase, one lowercase, and one digit
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit' });
    }

    // Only allow users to change their own password, or owner to change anyone's
    if (req.user.id !== parseInt(req.params.id, 10) && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const staff = staffData.getStaffById(req.params.id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    staffData.updateStaffPassword(req.params.id, passwordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating staff password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Deactivate staff member (soft delete)
router.delete('/:id', authenticateToken, requirePermission('staff:delete'), auditLog('delete', 'staff'), (req, res) => {
  try {
    const staff = staffData.getStaffById(req.params.id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Prevent deleting the last owner
    if (staff.role === 'owner') {
      const owners = staffData.getAllStaff({ role: 'owner', active: true });
      if (owners.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last owner' });
      }
    }

    staffData.deleteStaff(req.params.id);

    res.json({ message: 'Staff member deactivated successfully' });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

module.exports = router;
