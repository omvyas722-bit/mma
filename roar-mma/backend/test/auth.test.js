const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_PATH = ':memory:';

const { hasPermission, authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

describe('hasPermission', () => {
  it('grants all permissions to owner', () => {
    assert.equal(hasPermission('owner', 'anything:whatever'), true);
  });

  it('grants exact permission to gm', () => {
    assert.equal(hasPermission('gm', 'members:read'), true);
  });

  it('grants wildcard permission to gm', () => {
    assert.equal(hasPermission('gm', 'bookings:create'), true);
  });

  it('denies unlisted permission to front_desk', () => {
    assert.equal(hasPermission('front_desk', 'reports:write'), false);
  });

  it('grants wildcard to sales for leads', () => {
    assert.equal(hasPermission('sales', 'leads:delete'), true);
  });

  it('denies permission to unknown role', () => {
    assert.equal(hasPermission('unknown', 'members:read'), false);
  });

  it('coach has grading:write', () => {
    assert.equal(hasPermission('coach', 'grading:write'), true);
  });

  it('coach cannot access leads', () => {
    assert.equal(hasPermission('coach', 'leads:create'), false);
  });

  it('social wildcard grants all social: permissions', () => {
    assert.equal(hasPermission('social', 'social:*'), true);
    assert.equal(hasPermission('social', 'social:post'), true);
    assert.equal(hasPermission('social', 'members:read'), false);
  });
});

describe('authenticateToken', () => {
  it('returns 401 when no auth header', () => {
    const req = { headers: {} };
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    authenticateToken(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(jsonBody.error, 'Access token or API key required');
  });

  it('returns 401 with invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad-token' } };
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    authenticateToken(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(jsonBody.error, 'Invalid or expired token');
  });

  it('returns 500 when JWT_SECRET missing at runtime', () => {
    const orig = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const req = { headers: { authorization: 'Bearer some-token' } };
      let statusCode, jsonBody;
      const res = {
        status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
      };
      authenticateToken(req, res, () => {});
      assert.equal(statusCode, 500);
      assert.equal(jsonBody.error, 'Server authentication configuration error');
    } finally {
      process.env.JWT_SECRET = orig;
    }
  });

  it('calls next with valid token', () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 1, role: 'owner' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    let called = false;
    authenticateToken(req, req, () => { called = true; });
    assert.equal(called, true);
  });
});

describe('requireRole', () => {
  it('passes when role matches', () => {
    const req = { user: { role: 'owner' } };
    let called = false;
    requireRole('owner', 'gm')(req, {}, () => { called = true; });
    assert.equal(called, true);
  });

  it('blocks when role does not match', () => {
    const req = { user: { role: 'coach' } };
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    requireRole('owner', 'gm')(req, res, () => {});
    assert.equal(statusCode, 403);
    assert.equal(jsonBody.error, 'Insufficient permissions');
  });

  it('returns 401 when no user', () => {
    const req = {};
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    requireRole('owner')(req, res, () => {});
    assert.equal(statusCode, 401);
  });
});

describe('requirePermission', () => {
  it('passes when user has permission', () => {
    const req = { user: { role: 'gm' } };
    let called = false;
    requirePermission('members:read')(req, {}, () => { called = true; });
    assert.equal(called, true);
  });

  it('blocks when user lacks permission', () => {
    const req = { user: { role: 'coach' } };
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    requirePermission('leads:create')(req, res, () => {});
    assert.equal(statusCode, 403);
  });

  it('returns 401 when no user', () => {
    const req = {};
    let statusCode, jsonBody;
    const res = {
      status: (code) => ({ json: (body) => { statusCode = code; jsonBody = body; } }),
    };
    requirePermission('members:read')(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(jsonBody.error, 'Authentication required');
  });
});

describe('auth module require', () => {
  it('throws when JWT_SECRET not set at require time', () => {
    const origSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete require.cache[require.resolve('../middleware/auth')];
    assert.throws(() => {
      require('../middleware/auth');
    }, /JWT_SECRET/);
    process.env.JWT_SECRET = origSecret;
    delete require.cache[require.resolve('../middleware/auth')];
    require('../middleware/auth');
  });
});
