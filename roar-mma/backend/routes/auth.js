// Authentication routes
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../db/connection');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT * FROM staff WHERE email = ? AND active = 1').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

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
      { expiresIn: JWT_EXPIRY }
    );

    // Remove sensitive fields from response
    const { password_hash, reset_token, reset_token_expires, two_factor_secret, api_key, ...safeUser } = user;

    res.json({
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Change password (rate limited to prevent brute force)
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password change attempts, please try again later' }
});
router.post('/change-password', changePasswordLimiter, authenticateToken, async (req, res) => {
  try {
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

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    db.prepare("UPDATE staff SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newPasswordHash, req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[AUTH] Change password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
