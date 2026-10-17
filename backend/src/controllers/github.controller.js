const crypto = require('crypto');
const env = require('../config/env');
const oauthService = require('../services/oauthService');
const githubService = require('../services/githubService');
const Repository = require('../models/Repository');
const User = require('../models/User');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.startOAuth = asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('skillproof_oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/github'
  });
  res.redirect(oauthService.createAuthorization(state));
});

exports.callback = asyncHandler(async (req, res) => {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }).filter(([key]) => key));
  const expected = cookies.skillproof_oauth_state;
  res.clearCookie('skillproof_oauth_state', { path: '/api/github' });
  const stateBuffer = Buffer.from(typeof req.query.state === 'string' ? req.query.state : '');
  const expectedBuffer = Buffer.from(expected || '');
  if (!expected || expectedBuffer.length !== stateBuffer.length || !crypto.timingSafeEqual(expectedBuffer, stateBuffer)) {
    const error = new Error('GitHub OAuth state validation failed');
    error.status = 400;
    throw error;
  }
  if (typeof req.query.code !== 'string') {
    const error = new Error('GitHub did not return an authorization code');
    error.status = 400;
    throw error;
  }
  const result = await oauthService.completeLogin(req.query.code);
  res.redirect(`${env.CLIENT_URL}/#token=${encodeURIComponent(result.token)}`);
});

exports.connection = asyncHandler(async (req, res) => {
  success(res, {
    connected: Boolean(req.user.githubUsername && req.user.githubAccessToken),
    login: req.user.githubUsername || undefined,
    configured: env.githubConfigured,
    message: env.githubConfigured ? undefined : 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable GitHub OAuth.'
  });
});

exports.disconnectAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash +githubAccessToken');
  if (user?.githubUsername && !user.passwordHash) {
    const error = new Error('Set a password through Forgot password before disconnecting GitHub, so you can still sign in.');
    error.status = 409;
    throw error;
  }
  if (user?.githubUsername) {
    const { deleteRepositoryData } = require('../services/accountDataService');
    await deleteRepositoryData(user._id);
    user.githubUsername = undefined;
    user.githubAccessToken = undefined;
    await user.save();
  }
  success(res, null, 'GitHub disconnected. Connected repositories and their assessments were removed.');
});

exports.repositories = asyncHandler(async (req, res) => {
  const repositories = await githubService.listRepositories(req.user);
  success(res, repositories.map(repository => ({
    ...repository,
    language: repository.primaryLanguage || 'Unknown',
    branch: repository.defaultBranch,
    latestSha: '',
    analyzedSha: '',
    analyzedAt: null,
    files: [],
    commits: []
  })));
});

exports.connectRepository = asyncHandler(async (req, res) => {
  const external = (await githubService.listRepositories(req.user)).find(repo => repo.id === String(req.body.id));
  if (!external || external.isPrivate) {
    const error = new Error('Repository is not accessible to the connected GitHub account');
    error.status = 404;
    throw error;
  }
  const repository = await Repository.findOneAndUpdate(
    { user: req.user._id, repoFullName: external.repoFullName },
    {
      $set: {
        repoUrl: external.repoUrl,
        defaultBranch: external.defaultBranch,
        primaryLanguage: external.primaryLanguage,
        isPrivate: external.isPrivate,
        status: 'connected'
      }
    },
    { upsert: true, new: true, runValidators: true }
  );
  success(res, { id: String(repository._id), repoFullName: repository.repoFullName }, 'Repository connected', 201);
});

exports.disconnectRepository = asyncHandler(async (req, res) => {
  const repository = await Repository.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!repository) {
    const error = new Error('Repository not found');
    error.status = 404;
    throw error;
  }
  const SkillAssessment = require('../models/SkillAssessment');
  const SkillEvidence = require('../models/SkillEvidence');
  const RepositoryChange = require('../models/RepositoryChange');
  const Job = require('../models/Job');
  const { refreshGaps } = require('../services/skillAssessmentService');
  const assessments = await SkillAssessment.find({ repository: repository._id, user: req.user._id }).select('_id');
  await SkillEvidence.deleteMany({ assessment: { $in: assessments.map(item => item._id) } });
  await SkillAssessment.deleteMany({ _id: { $in: assessments.map(item => item._id) } });
  await RepositoryChange.deleteMany({ repository: repository._id, user: req.user._id });
  const jobs = await Job.find({ user: req.user._id });
  for (const job of jobs) await refreshGaps(req.user, job);
  success(res, null, 'Repository disconnected');
});

exports.webhook = asyncHandler(async (req, res) => {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    const error = new Error('GitHub webhook is not configured. Set GITHUB_WEBHOOK_SECRET.');
    error.status = 503;
    throw error;
  }
  const signature = req.get('x-hub-signature-256') || '';
  const digest = `sha256=${crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(req.rawBody || '').digest('hex')}`;
  const received = Buffer.from(signature);
  const expected = Buffer.from(digest);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    const error = new Error('Invalid webhook signature');
    error.status = 401;
    throw error;
  }
  if (req.get('x-github-event') === 'push') {
    const fullName = req.body.repository?.full_name;
    const repository = await Repository.findOne({ repoFullName: fullName, isPrivate: { $ne: true } });
    if (repository) {
      const { detectAndReassess } = require('../services/changeDetectionService');
      const user = await User.findById(repository.user).select('+githubAccessToken');
      if (user && req.body.after && req.body.before !== '0000000000000000000000000000000000000000') {
        await detectAndReassess(user, repository);
      }
    }
  }
  success(res, { received: true });
});
