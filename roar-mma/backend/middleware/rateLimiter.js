const rateLimitMap = new Map();

function createRateLimiter(options) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 10;

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);

    if (timestamps.length >= max) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    next();
  };
}

function clearExpired() {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < 15 * 60 * 1000);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
}

setInterval(clearExpired, 5 * 60 * 1000);

module.exports = { createRateLimiter };
