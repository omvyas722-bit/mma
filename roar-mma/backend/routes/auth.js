// Authentication routes
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/connection');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDatabase();
  const user = db.prepare('SELECT * FROM staff WHERE email = ? AND active = 1').get(email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Remove password hash from response
  delete user.password_hash;

  res.json({
    token,
    user
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, name, email, role, phone, active FROM staff WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more complex system, we'd invalidate the token here
  // For now, client just removes the token
  res.json({ message: 'Logged out successfully' });
});

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDatabase();
  const user = db.prepare('SELECT password_hash FROM staff WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newPasswordHash = bcrypt.hashSync(newPassword, 10);

  db.prepare('UPDATE staff SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
    .run(newPasswordHash, req.user.id);

  res.json({ message: 'Password changed successfully' });
});

module.exports = router;
