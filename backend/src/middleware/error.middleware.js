const env = require('../config/env');
const logger = require('../utils/logger');

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : error.code === 11000 ? 409 : 500);
  if (status >= 500) logger.error(error.message, { path: req.originalUrl, stack: error.stack });
  const message = status >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  res.status(status).json({ message, ...(error.details ? { details: error.details } : {}) });
};
