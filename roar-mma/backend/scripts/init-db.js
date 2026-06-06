// Database initialization script
// Delegates to the canonical init-database.js which handles migrations

console.warn('⚠️  DEPRECATED: scripts/init-db.js is deprecated. Use scripts/init-database.js or npm run db:init instead.');

const { initDatabase } = require('./init-database');

module.exports = { initDatabase };

// Run if called directly
if (require.main === module) {
  try {
    initDatabase();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}
