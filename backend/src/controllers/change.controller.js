const RepositoryChange = require('../models/RepositoryChange');
const Repository = require('../models/Repository');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const publicRepositoryIds = require('../utils/publicRepositoryIds');

exports.list = asyncHandler(async (req, res) => {
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const changes = await RepositoryChange.find({ user: req.user._id, repository: { $in: repositoryIds } }).populate('repository', 'repoFullName').sort({ detectedAt: -1 }).limit(100);
  success(res, changes.map(change => ({
    id: String(change._id),
    repo: change.repository?.repoFullName || '',
    message: change.commitMessage,
    sha: change.afterSha,
    files: change.changedFiles,
    affected: change.affectedSkills,
    before: {},
    state: change.reassessmentStatus,
    detectedAt: change.detectedAt,
    simulated: false
  })));
});

exports.get = asyncHandler(async (req, res) => {
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const change = await RepositoryChange.findOne({ _id: req.params.id, user: req.user._id, repository: { $in: repositoryIds } }).populate('repository', 'repoFullName');
  if (!change) {
    const error = new Error('Repository change not found');
    error.status = 404;
    throw error;
  }
  success(res, { id: String(change._id), repo: change.repository?.repoFullName || '', message: change.commitMessage, sha: change.afterSha, files: change.changedFiles, affected: change.affectedSkills, state: change.reassessmentStatus, detectedAt: change.detectedAt, simulated: false });
});

exports.status = asyncHandler(async (req, res) => {
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const change = await RepositoryChange.findOne({ _id: req.params.id, user: req.user._id, repository: { $in: repositoryIds } });
  if (change) {
    success(res, { state: change.reassessmentStatus, affectedSkills: change.affectedSkills });
    return;
  }
  const repository = await Repository.findOne({ _id: req.params.id, user: req.user._id, isPrivate: { $ne: true } });
  if (!repository) {
    const error = new Error('Analysis not found');
    error.status = 404;
    throw error;
  }
  success(res, { state: repository.status });
});
