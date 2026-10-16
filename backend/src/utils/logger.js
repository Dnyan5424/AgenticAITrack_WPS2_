const env = require('../config/env');

function write(level, message, details) {
  const entry = { level, message, ...(details ? { details } : {}), timestamp: new Date().toISOString() };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else if (env.NODE_ENV !== 'test') console.log(output);
}

module.exports = {
  info: (message, details) => write('info', message, details),
  warn: (message, details) => write('warn', message, details),
  error: (message, details) => write('error', message, details)
};
