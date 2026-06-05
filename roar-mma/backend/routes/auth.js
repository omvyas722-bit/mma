// Authentication routes
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../db/connection');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET;

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

// === Password Reset ===
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const db = getDatabase();
    const user = db.prepare('SELECT id, email FROM staff WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString();
    db.prepare("UPDATE staff SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(token, expires, user.id);

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    try {
      const messagingProviders = require('../services/messagingProviders');
      await messagingProviders.sendEmail(email, 'Password Reset - ROAR MMA', `Click here to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`);
    } catch { console.log(`[RESET] Email not sent (no provider). Link: ${resetLink}`); }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[AUTH] Forgot password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ error: 'email, token, and newPassword required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const db = getDatabase();
    const user = db.prepare('SELECT id, reset_token_expires FROM staff WHERE email = ? AND reset_token = ?').get(email, token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (new Date(user.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset token has expired' });

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE staff SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('[AUTH] Reset password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// === Two-Factor Auth ===
router.post('/setup-2fa', authenticateToken, requirePermission('settings:write'), async (req, res) => {
  try {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(20).toString('hex');
    const db = getDatabase();
    db.prepare("UPDATE staff SET two_factor_secret = ? WHERE id = ?").run(secret, req.user.id);
    res.json({
      secret,
      url: `otpauth://totp/ROAR%20MMA:${encodeURIComponent(req.user.email || req.user.name)}?secret=${Buffer.from(secret).toString('base64').slice(0, 32).padEnd(32, '=')}&issuer=ROAR%20MMA`,
    });
  } catch (err) {
    console.error('[AUTH] Setup 2FA error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-2fa', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code required' });
    const db = getDatabase();
    const user = db.prepare('SELECT two_factor_secret FROM staff WHERE id = ?').get(req.user.id);
    if (!user?.two_factor_secret) return res.status(400).json({ error: '2FA not set up' });

    // Simple TOTP check using the stored secret
    const crypto = require('crypto');
    const time = Math.floor(Date.now() / 30000);
    const key = Buffer.from(user.two_factor_secret);
    for (let offset = -1; offset <= 1; offset++) {
      const timeBuf = Buffer.alloc(8);
      timeBuf.writeBigInt64BE(BigInt(time + offset));
      const hmac = crypto.createHmac('sha1', key).update(timeBuf).digest();
      const off = hmac[hmac.length - 1] & 0xf;
      const num = (hmac.readUInt32BE(off) & 0x7fffffff) % 1000000;
      const expected = String(num).padStart(6, '0');
      if (code === expected) {
        db.prepare("UPDATE staff SET two_factor_enabled = 1 WHERE id = ?").run(req.user.id);
        return res.json({ success: true, message: '2FA enabled' });
      }
    }
    res.status(400).json({ error: 'Invalid verification code' });
  } catch (err) {
    console.error('[AUTH] Verify 2FA error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/disable-2fa', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const db = getDatabase();
    db.prepare("UPDATE staff SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?").run(req.user.id);
    res.json({ message: '2FA disabled' });
  } catch (err) {
    console.error('[AUTH] Disable 2FA error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === API Key Management ===
router.post('/generate-api-key', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const { name } = req.body;
    const crypto = require('crypto');
    const apiKey = `roar_${crypto.randomBytes(24).toString('hex')}`;
    const db = getDatabase();
    db.prepare("UPDATE staff SET api_key = ?, api_key_name = ? WHERE id = ?").run(apiKey, name || 'API Key', req.user.id);
    res.json({ api_key: apiKey, message: 'Save this key - it will not be shown again' });
  } catch (err) {
    console.error('[AUTH] Generate API key error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/revoke-api-key', authenticateToken, requirePermission('settings:write'), (req, res) => {
  try {
    const db = getDatabase();
    db.prepare("UPDATE staff SET api_key = NULL, api_key_name = NULL WHERE id = ?").run(req.user.id);
    res.json({ message: 'API key revoked' });
  } catch (err) {
    console.error('[AUTH] Revoke API key error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check-api-key', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  const db = getDatabase();
  const user = db.prepare('SELECT id, name, email, role FROM staff WHERE api_key = ? AND active = 1').get(apiKey);
  if (!user) return res.status(401).json({ error: 'Invalid API key' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user });
});

module.exports = router;
