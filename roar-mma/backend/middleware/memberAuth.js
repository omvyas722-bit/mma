const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[MEMBER-AUTH] JWT_SECRET not set');

function authenticateMember(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Member access token required' });

  try {
    const member = jwt.verify(token, JWT_SECRET);
    if (member.type !== 'member') return res.status(403).json({ error: 'Not a member token' });
    req.member = member;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired member token' });
  }
}

module.exports = { authenticateMember };