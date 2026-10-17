const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');
const Job = require('../models/Job');
const Repository = require('../models/Repository');
const publicRepositoryIds = require('../utils/publicRepositoryIds');
const { reportFrom } = require('../services/skillAssessmentService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ user: req.user._id }).select('_id requiredSkills preferredSkills');
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const query = { user: req.user._id, repository: { $in: repositoryIds } };
  if (req.query.jobId) query.job = req.query.jobId;
  const assessments = await SkillAssessment.find(query).populate('repository', 'repoFullName');
  const evidenceRows = await SkillEvidence.find({ assessment: { $in: assessments.map(item => item._id) } }).sort({ createdAt: -1 });
  const evidenceByAssessment = new Map();
  for (const item of evidenceRows) {
    const key = String(item.assessment);
    const rows = evidenceByAssessment.get(key) || [];
    if (rows.length < 8) rows.push(item);
    evidenceByAssessment.set(key, rows);
  }
  const grouped = new Map();
  for (const item of assessments) {
    const existing = grouped.get(item.skill) || [];
    existing.push(item);
    grouped.set(item.skill, existing);
  }
  const result = [...grouped.entries()].map(([name, rows]) => {
    const best = rows.find(row => row.status === 'demonstrated') || rows.find(row => row.status === 'partial') || rows[0];
    return {
      name,
      category: jobs.some(job => job.requiredSkills.includes(name)) ? 'required' : 'preferred',
      status: best.status,
      confidence: best.confidence,
      reason: best.reason,
      gap: best.gap,
      updatedAt: best.updatedAt,
      evidence: (evidenceByAssessment.get(String(best._id)) || []).map(item => ({
        repo: best.repository?.repoFullName || '',
        file: item.filePath,
        excerpt: item.snippet,
        commit: item.commitSha,
        explanation: item.explanation,
        url: item.fileUrl
      }))
    };
  });
  success(res, result);
});

exports.evidence = asyncHandler(async (req, res) => {
  const skill = req.params.skill.toLowerCase();
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const assessments = await SkillAssessment.find({ user: req.user._id, repository: { $in: repositoryIds }, skill: new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).populate('repository', 'repoFullName');
  const evidence = await SkillEvidence.find({ assessment: { $in: assessments.map(item => item._id) } }).sort({ createdAt: -1 }).limit(100);
  const assessmentById = new Map(assessments.map(item => [String(item._id), item]));
  success(res, evidence.map(item => ({
    repo: assessmentById.get(String(item.assessment))?.repository?.repoFullName || '',
    file: item.filePath,
    excerpt: item.snippet,
    commit: item.commitSha,
    explanation: item.explanation,
    url: item.fileUrl
  })));
});

exports.careerDna = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ user: req.user._id });
  const repositoryIds = await publicRepositoryIds(req.user._id);
  const assessments = await SkillAssessment.find({ user: req.user._id, repository: { $in: repositoryIds } }).populate('repository', 'repoFullName');
  const evidenceRows = await SkillEvidence.find({ assessment: { $in: assessments.map(item => item._id) } }).sort({ createdAt: -1 });
  const skillNames = [...new Set(jobs.flatMap(job => [...job.requiredSkills, ...job.preferredSkills]))];
  const result = skillNames.map(name => {
    const rows = assessments.filter(item => item.skill.toLowerCase() === name.toLowerCase());
    const best = rows.find(item => item.status === 'demonstrated') || rows.find(item => item.status === 'partial') || rows[0];
    const evidence = best ? evidenceRows.filter(item => String(item.assessment) === String(best._id)).slice(0, 8).map(item => ({
      repo: best.repository?.repoFullName || '', file: item.filePath, excerpt: item.snippet,
      commit: item.commitSha, explanation: item.explanation, url: item.fileUrl
    })) : [];
    return { name, category: 'job-aligned', status: best?.status || 'not_demonstrated_in_this_scope', confidence: best?.confidence || 0, reason: best?.reason || 'Not demonstrated in this scope.', evidence, updatedAt: best?.updatedAt };
  });
  success(res, result);
});

exports.analysis = asyncHandler(async (req, res) => {
  const repository = await Repository.findOne({ _id: req.params.id, user: req.user._id, isPrivate: { $ne: true } });
  if (repository) {
    const assessments = await SkillAssessment.find({ user: req.user._id, repository: repository._id });
    success(res, { id: String(repository._id), state: repository.status, commitSha: repository.lastAnalyzedCommitSha, assessments });
    return;
  }
  const error = new Error('Analysis not found');
  error.status = 404;
  throw error;
});
