const Job = require('../models/Job');
const Repository = require('../models/Repository');
const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');
const GapReport = require('../models/GapReport');
const githubService = require('../services/githubService');
const { parseJobDescription } = require('../services/jobParserService');
const { assessSkills, refreshGaps, reportFrom } = require('../services/skillAssessmentService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const publicRepositoryIds = require('../utils/publicRepositoryIds');

function toFrontend(job) {
  return {
    id: String(job._id),
    title: job.title,
    company: job.company,
    sourceUrl: job.sourceUrl,
    sample: false,
    requirements: [
      ...job.requiredSkills.map(name => ({ name, required: true })),
      ...job.preferredSkills.map(name => ({ name, required: false }))
    ],
    analysisStatus: job.analysisStatus
  };
}

async function ownedJob(id, user) {
  const job = await Job.findOne({ _id: id, user: user._id });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    throw error;
  }
  return job;
}

exports.analyze = asyncHandler(async (req, res) => {
  const text = req.body.text.trim();
  const parsed = parseJobDescription(text);
  const job = await Job.create({
    user: req.user._id,
    title: req.body.title?.trim() || parsed.title,
    company: req.body.company?.trim() || parsed.company,
    sourceUrl: req.body.url || '',
    rawDescription: text,
    requiredSkills: parsed.requiredSkills,
    preferredSkills: parsed.preferredSkills,
    analysisStatus: 'ready'
  });
  success(res, toFrontend(job), 'Job description analyzed', 201);
});

exports.list = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  success(res, jobs.map(toFrontend));
});

exports.assess = asyncHandler(async (req, res) => {
  const job = await ownedJob(req.params.id, req.user);
  const repositories = await Repository.find({ user: req.user._id, isPrivate: { $ne: true }, status: { $ne: 'failed' } });
  if (!repositories.length) {
    const error = new Error('Connect at least one GitHub repository before assessing this job');
    error.status = 409;
    throw error;
  }
  job.analysisStatus = 'assessing';
  await job.save();
  try {
    for (const repository of repositories) {
      repository.status = 'analyzing';
      await repository.save();
      const snapshot = await githubService.fetchRepositorySnapshot(req.user, repository);
      await assessSkills({ user: req.user, job, repository, snapshot });
      repository.lastAnalyzedCommitSha = snapshot.commitSha;
      repository.lastAnalyzedAt = new Date();
      repository.defaultBranch = snapshot.branch;
      repository.primaryLanguage = snapshot.language;
      repository.status = 'analyzed';
      await repository.save();
    }
    await refreshGaps(req.user, job);
    job.analysisStatus = 'assessed';
    await job.save();
  } catch (error) {
    job.analysisStatus = 'failed';
    await job.save();
    throw error;
  }
  success(res, await getReportPayload(job, req.user), 'Assessment completed');
});

async function getReportPayload(job, user) {
  const repositoryIds = await publicRepositoryIds(user._id);
  const assessments = await SkillAssessment.find({ user: user._id, job: job._id, repository: { $in: repositoryIds } }).populate('repository', 'repoFullName repoUrl');
  const report = reportFrom(assessments, job);
  for (const skill of report.skills) {
    const matches = assessments.filter(item => item.skill.toLowerCase() === skill.name.toLowerCase());
    const best = matches.find(item => item.status === 'demonstrated') || matches.find(item => item.status === 'partial') || matches[0];
    if (!best) continue;
    const evidence = await SkillEvidence.find({ assessment: best._id }).limit(8);
    skill.evidence = evidence.map(item => ({
      repo: best.repository?.repoFullName || '',
      file: item.filePath,
      excerpt: item.snippet,
      commit: item.commitSha,
      explanation: item.explanation,
      url: item.fileUrl
    }));
    skill.category = skill.required ? 'required' : 'preferred';
    skill.updatedAt = best.updatedAt;
    skill.gap = best.gap;
    skill.improvement = best.gap;
  }
  return { ...report, job: toFrontend(job) };
}

exports.report = asyncHandler(async (req, res) => {
  const job = await ownedJob(req.params.id, req.user);
  success(res, await getReportPayload(job, req.user));
});

exports.gapReport = asyncHandler(async (req, res) => {
  const job = await ownedJob(req.params.id, req.user);
  const gaps = await GapReport.find({ user: req.user._id, job: job._id });
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const assessments = await SkillAssessment.find({ user: req.user._id, job: job._id, repository: { $in: repositoryIds } });
  const toAssessment = gap => {
    const assessment = assessments.find(item => item.skill.toLowerCase() === gap.skill.toLowerCase());
    return {
      name: gap.skill,
      category: gap.gapLevel,
      status: assessment?.status || 'not_demonstrated_in_this_scope',
      confidence: assessment?.confidence || 0,
      reason: gap.reason,
      gap: gap.recommendation,
      improvement: gap.suggestedProject,
      evidence: []
    };
  };
  success(res, {
    critical: gaps.filter(item => item.gapLevel === 'critical').map(toAssessment),
    moderate: gaps.filter(item => item.gapLevel === 'moderate').map(toAssessment),
    preferred: gaps.filter(item => item.gapLevel === 'preferred').map(toAssessment),
    insufficient: gaps.filter(item => item.gapLevel === 'insufficient').map(toAssessment)
  });
});

exports.getOwnedJob = ownedJob;
