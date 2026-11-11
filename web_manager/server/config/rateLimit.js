const rateLimit = require('express-rate-limit');

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
};

exports.apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 300
});

exports.uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 20
});

// Heavy MongoDB queries (/api/mongodb/device-history, /switch-stats, /sensor-data):
// counted per account, so it must run after the authentication middleware
// (req.currentUser). One page load sends the 3 requests: 60 = 20 loads / 15 min.
exports.deviceHistoryLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.DEVICE_HISTORY_RATE_LIMIT || 60),
  keyGenerator: (req) => (req.currentUser && req.currentUser.users_id !== undefined
    ? 'user_' + (req.auth && req.auth.type) + '_' + req.currentUser.users_id
    : 'ip_' + req.ip)
});

exports.authLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 10
});