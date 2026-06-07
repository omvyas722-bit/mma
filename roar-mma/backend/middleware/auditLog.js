const { getDatabase } = require('../db/connection');

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`;

const INSERT_SQL = `INSERT INTO audit_logs
  (user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function ensureAuditLogTable() {
  getDatabase().exec(CREATE_TABLE_SQL);
}

function auditLog(action, entityType, opts = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const entityId = req.params.id || req.body?.id || body?.id || null;
      const details = { method: req.method, path: req.path, statusCode: res.statusCode };
      if (req.body && Object.keys(req.body).length) {
        const safe = { ...req.body };
        delete safe.password;
        delete safe.password_hash;
        delete safe.token;
        details.body = safe;
      }
      if (opts.getMeta) {
        try { const meta = opts.getMeta(req); if (meta) Object.assign(details, meta); } catch {}
      }
      const db = getDatabase();
      db.prepare(INSERT_SQL).run(
        req.user?.id || null,
        req.user?.name || null,
        req.user?.role || null,
        action,
        entityType,
        entityId != null ? String(entityId) : null,
        JSON.stringify(details),
        req.ip || req.connection?.remoteAddress || null,
        req.get('User-Agent') || null
      );
      return originalJson(body);
    };
    next();
  };
}

function logAuditEvent(db, { userId, userName, userRole, action, entityType, entityId, details }) {
  db.prepare(INSERT_SQL).run(
    userId || null,
    userName || null,
    userRole || null,
    action,
    entityType || null,
    entityId != null ? String(entityId) : null,
    details ? JSON.stringify(details) : null,
    null,
    null
  );
}

module.exports = { auditLog, logAuditEvent, ensureAuditLogTable };
