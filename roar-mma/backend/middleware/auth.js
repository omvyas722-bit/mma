// Authentication middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_min_32_chars_random_string_here';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
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
      'members:read', 'members:create', 'members:update',
      'classes:read', 'classes:create', 'classes:update',
      'bookings:*',
      'leads:*',
      'reports:read',
      'staff:read'
    ],
    front_desk: [
      'members:read', 'members:create',
      'classes:read',
      'bookings:*',
      'waivers:*'
    ],
    coach: [
      'classes:read',
      'attendance:*',
      'members:read'
    ],
    sales: [
      'leads:*',
      'members:read'
    ],
    social: [
      'social:*'
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
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  hasPermission,
  JWT_SECRET
};
