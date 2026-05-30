// Authentication middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server authentication configuration error' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
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

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  hasPermission
};
