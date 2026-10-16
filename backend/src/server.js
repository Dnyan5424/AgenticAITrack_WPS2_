const app = require('./app');
const env = require('./config/env');
const connectDatabase = require('./config/db');
const logger = require('./utils/logger');
const { startRepositoryWatcher } = require('./workers/repositoryWatcher');

async function start() {
  await connectDatabase();
  const server = app.listen(env.PORT, () => logger.info(`SkillProof API listening on http://localhost:${env.PORT}`));
  if (env.WATCHER_ENABLED === 'true') startRepositoryWatcher();
  const shutdown = signal => {
    logger.info(`Received ${signal}; shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(error => {
  logger.error('Unable to start SkillProof API', { message: error.message });
  process.exitCode = 1;
});
