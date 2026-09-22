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

exports.authLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 10
});