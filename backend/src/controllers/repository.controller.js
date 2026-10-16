const Repository = require('../models/Repository');
const SkillAssessment = require('../models/SkillAssessment');
const Job = require('../models/Job');
const githubService = require('../services/githubService');
const changeService = require('../services/changeDetectionService');
const { assessSkills, refreshGaps } = require('../services/skillAssessmentService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

async function ownedRepository(id, user) {
  const repository = await Repository.findOne({ _id: id, user: user._id, isPrivate: { $ne: true } });
  if (!repository) {
    const error = new Error('Repository not found');
    error.status = 404;
    throw error;
  }
  return repository;
}

function fileKind(path) {
  if (/\.sql$/i.test(path)) return 'sql';
  if (/(\.test\.|\.spec\.|\/tests?\/|_test\.)/i.test(path)) return 'test';
  if (/docker|\.ya?ml$|\.toml$|\.json$/i.test(path)) return 'deploy';
  if (/\.(md|mdx|rst)$/i.test(path)) return 'doc';
  return 'source';
}

exports.list = asyncHandler(async (req, res) => {
  const repositories = await Repository.find({ user: req.user._id, isPrivate: { $ne: true } }).sort({ updatedAt: -1 });
  success(res, repositories.map(repo => ({
    id: String(repo._id),
    name: repo.repoFullName,
    repoFullName: repo.repoFullName,
    repoUrl: repo.repoUrl,
    language: repo.primaryLanguage || 'Unknown',
    branch: repo.defaultBranch,
    latestSha: repo.lastAnalyzedCommitSha || '',
    analyzedSha: repo.lastAnalyzedCommitSha || '',
    analyzedAt: repo.lastAnalyzedAt,
    description: '',
    files: [],
    commits: [],
    status: repo.status
  })));
});

exports.get = asyncHandler(async (req, res) => {
  const repository = await ownedRepository(req.params.id, req.user);
  const snapshot = await githubService.fetchRepositorySnapshot(req.user, repository);
  const { commits } = snapshot;
  const files = snapshot.files.map(file => ({
    path: file.path,
    kind: fileKind(file.path),
    excerpt: file.content.split(/\r?\n/).slice(0, 6).join('\n').slice(0, 500),
    explanation: `Retrieved from ${repository.repoFullName} at commit ${snapshot.commitSha}.`
  }));
  success(res, {
    id: String(repository._id),
    name: repository.repoFullName,
    language: snapshot.language || 'Unknown',
    branch: snapshot.branch,
    latestSha: snapshot.commitSha,
    analyzedSha: repository.lastAnalyzedCommitSha || '',
    analyzedAt: repository.lastAnalyzedAt,
    description: '',
    files,
    commits: commits.map(commit => ({ ...commit, files: [] }))
  });
});

exports.files = asyncHandler(async (req, res) => {
  const repository = await ownedRepository(req.params.id, req.user);
  const snapshot = await githubService.fetchRepositorySnapshot(req.user, repository);
  success(res, snapshot.files.map(file => ({
    path: file.path,
    kind: fileKind(file.path),
    excerpt: file.content.split(/\r?\n/).slice(0, 8).join('\n').slice(0, 700),
    explanation: `Retrieved from ${repository.repoFullName} at commit ${snapshot.commitSha}.`
  })));
});

exports.analyze = asyncHandler(async (req, res) => {
  const repository = await ownedRepository(req.params.id, req.user);
  const jobs = await Job.find({ user: req.user._id });
  if (!jobs.length) {
    const error = new Error('Analyze a job description before assessing repository skills');
    error.status = 409;
    throw error;
  }
  const snapshot = await githubService.fetchRepositorySnapshot(req.user, repository);
  repository.status = 'analyzing';
  await repository.save();
  for (const job of jobs) {
    await assessSkills({ user: req.user, job, repository, snapshot });
    await refreshGaps(req.user, job);
  }
  repository.lastAnalyzedCommitSha = snapshot.commitSha;
  repository.lastAnalyzedAt = new Date();
  repository.defaultBranch = snapshot.branch;
  repository.primaryLanguage = snapshot.language;
  repository.status = 'analyzed';
  await repository.save();
  success(res, { analysisId: String(repository._id), commitSha: snapshot.commitSha, assessedJobs: jobs.length });
});

exports.sync = asyncHandler(async (req, res) => {
  const repository = await ownedRepository(req.params.id, req.user);
  if (!repository.lastAnalyzedCommitSha) {
    const snapshot = await githubService.fetchRepositorySnapshot(req.user, repository);
    repository.lastAnalyzedCommitSha = snapshot.commitSha;
    repository.lastAnalyzedAt = new Date();
    repository.status = 'analyzed';
    await repository.save();
    success(res, { changed: false, message: 'Initial commit baseline recorded; run repository analysis to assess skills.' });
    return;
  }
  const change = await changeService.detectAndReassess(req.user, repository);
  success(res, change ? { changed: true, changeId: String(change._id), affectedSkills: change.affectedSkills } : { changed: false, message: 'Repository is up to date.' });
});

exports.ownedRepository = ownedRepository;
