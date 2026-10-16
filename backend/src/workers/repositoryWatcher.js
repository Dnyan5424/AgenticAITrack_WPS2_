const cron = require('node-cron');
const Repository = require('../models/Repository');
const User = require('../models/User');
const { detectAndReassess } = require('../services/changeDetectionService');
const logger = require('../utils/logger');

let task;
let running = false;

function startRepositoryWatcher() {
  if (task) return;
  task = cron.schedule('*/15 * * * *', async () => {
    if (running) return;
    running = true;
    try {
      const repositories = await Repository.find({ status: { $ne: 'failed' }, lastAnalyzedCommitSha: { $ne: null } });
      for (const repository of repositories) {
        try {
          const user = await User.findById(repository.user).select('+githubAccessToken');
          if (user?.githubAccessToken) await detectAndReassess(user, repository);
        } catch (error) {
          logger.error('Repository watcher failed for a repository', { repositoryId: String(repository._id), message: error.message });
        }
      }
    } catch (error) {
      logger.error('Repository watcher run failed', { message: error.message });
    } finally {
      running = false;
    }
  });
  logger.info('Repository watcher scheduled (15-minute interval)');
}

function stopRepositoryWatcher() {
  if (task) task.stop();
  task = null;
}

module.exports = { startRepositoryWatcher, stopRepositoryWatcher };
