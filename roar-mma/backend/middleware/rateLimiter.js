const rateLimit = require('express-rate-limit');
function createRateLimiter(opts) { return rateLimit(opts); }
module.exports = { createRateLimiter };
