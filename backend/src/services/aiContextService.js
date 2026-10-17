const Job = require('../models/Job');
const Repository = require('../models/Repository');
const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');

async function buildCareerContext(userId) {
  const [jobs, repositories, assessments] = await Promise.all([
    Job.find({ user: userId }).sort({ updatedAt: -1 }).limit(5).select('title requiredSkills preferredSkills analysisStatus').lean(),
    Repository.find({ user: userId }).sort({ updatedAt: -1 }).limit(5).select('repoFullName primaryLanguage status').lean(),
    SkillAssessment.find({ user: userId }).sort({ updatedAt: -1 }).limit(20)
      .populate('job', 'title').populate('repository', 'repoFullName').lean()
  ]);
  const evidence = await SkillEvidence.find({ assessment: { $in: assessments.map(row => row._id) } })
    .sort({ updatedAt: -1 }).limit(12).select('assessment filePath snippet evidenceType').lean();
  const evidenceByAssessment = new Map();
  for (const row of evidence) {
    const key = String(row.assessment);
    const list = evidenceByAssessment.get(key) || [];
    if (list.length < 2) list.push(row);
    evidenceByAssessment.set(key, list);
  }
  return [
    'VERIFIED SKILLPROOF DATA (repository/job assessment records; evidence may be incomplete):',
    `Jobs: ${JSON.stringify(jobs.map(job => ({ title: job.title, requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, status: job.analysisStatus })))}`,
    `Connected public repositories: ${JSON.stringify(repositories.map(repo => ({ name: repo.repoFullName, language: repo.primaryLanguage, status: repo.status })))}`,
    `Skill assessments: ${JSON.stringify(assessments.map(row => ({ skill: row.skill, status: row.status, confidence: row.confidence, job: row.job?.title, repository: row.repository?.repoFullName, evidence: (evidenceByAssessment.get(String(row._id)) || []).map(item => ({ type: item.evidenceType, path: item.filePath, snippet: item.snippet.slice(0, 350) })) })))}`,
    'Treat these records as scoped evidence, not proof of a person’s overall ability. Do not assume absent evidence means absent skill.'
  ].join('\n').slice(0, 9000);
}

module.exports = { buildCareerContext };
