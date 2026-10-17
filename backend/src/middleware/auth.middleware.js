const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    const error = new Error('Invalid or expired authentication token');
    error.status = 401;
    throw error;
  }
  const user = await User.findById(payload.sub).select('+githubAccessToken');
  if (!user || (payload.version ?? 0) !== (user.tokenVersion || 0)) {
    const error = new Error('Authenticated user no longer exists');
    error.status = 401;
    throw error;
  }
  req.user = user;
  next();
});
