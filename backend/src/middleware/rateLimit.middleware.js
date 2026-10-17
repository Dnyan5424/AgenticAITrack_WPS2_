const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: req =>
    (req.method === 'GET' && req.path === '/auth/github') ||
    (req.method === 'GET' && req.path === '/github/callback') ||
    req.path === '/github/connection' ||
    req.path === '/github/repositories' ||
    req.path.startsWith('/github/repositories/'),
  message: { message: 'Too many requests. Please try again later.' }
});
