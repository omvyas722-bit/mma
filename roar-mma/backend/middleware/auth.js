// Authentication middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const apiKey = req.headers['x-api-key'];

  if (!token && !apiKey) {
    return res.status(401).json({ error: 'Access token or API key required' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server authentication configuration error' });
  }

  // API key auth
  if (apiKey) {
    try {
      const { getDatabase } = require('../db/connection');
      const db = getDatabase();
      const user = db.prepare('SELECT id, name, email, role FROM staff WHERE api_key = ? AND active = 1').get(apiKey);
      if (user) {
        req.user = user;
        req.authMethod = 'api_key';
        return next();
      }
    } catch { /* fall through to JWT */ }
  }

  // JWT auth
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    req.authMethod = 'jwt';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

function hasPermission(userRole, permission) {
  const rolePermissions = {
    owner: ['*'],
    gm: [
      'members:read', 'members:create', 'members:update', 'members:delete',
      'classes:read', 'classes:create', 'classes:update', 'classes:delete',
      'bookings:*',
      'leads:*',
      'reports:read', 'reports:write',
      'staff:read', 'staff:create', 'staff:update',
      'dashboard:read',
      'ai:manage', 'ai:read',
      'analytics:read',
      'transactions:read', 'transactions:create',
      'attendance:*',
      'communications:read', 'communications:write',
      'settings:read', 'settings:write',
      'stock:read', 'stock:write',
      'grading:read', 'grading:write',
      'pt:read', 'pt:write',
      'retention:read', 'retention:write',
      'tasks:read', 'tasks:write'
    ],
    front_desk: [
      'members:read', 'members:create',
      'classes:read',
      'bookings:*',
      'leads:read', 'leads:create',
      'attendance:*',
      'communications:read',
      'dashboard:read'
    ],
    coach: [
      'classes:read',
      'attendance:*',
      'members:read',
      'grading:read', 'grading:write',
      'pt:read', 'pt:write',
      'tasks:read'
    ],
    sales: [
      'leads:*',
      'members:read',
      'communications:read', 'communications:write',
      'dashboard:read'
    ],
    social: [
      'social:*',
      'communications:read'
    ]
  };

  const permissions = rolePermissions[userRole] || [];

  // Owner has all permissions
  if (permissions.includes('*')) {
    return true;
  }

  // Check exact match
  if (permissions.includes(permission)) {
    return true;
  }

  // Check wildcard match (e.g., 'bookings:*' matches 'bookings:create')
  const [resource, action] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}

function requirePasswordChange(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { getDatabase } = require('../db/connection');
    const db = getDatabase();
    const staffCols = db.prepare("PRAGMA table_info('staff')").all().map(c => c.name);
    if (!staffCols.includes('must_change_password')) {
      return next();
    }
    const user = db.prepare('SELECT must_change_password FROM staff WHERE id = ?').get(req.user.id);
    if (user && user.must_change_password === 1) {
      return res.status(403).json({
        error: 'Password change required',
        must_change_password: true
      });
    }
  } catch { /* ignore and proceed */ }

  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  hasPermission,
  requirePasswordChange
};
