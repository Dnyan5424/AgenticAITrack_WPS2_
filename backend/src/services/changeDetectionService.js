const { githubClient } = require('../config/github');
const Job = require('../models/Job');
const RepositoryChange = require('../models/RepositoryChange');
const { fetchRepositorySnapshot } = require('./githubService');
const { affectedSkills, assessSkills, refreshGaps } = require('./skillAssessmentService');

async function detectAndReassess(user, repository) {
  const api = githubClient(user.githubAccessToken);
  const { data: repoInfo } = await api.get(`/repos/${repository.repoFullName}`);
  const branch = repoInfo.default_branch || repository.defaultBranch;
  const { data: branchInfo } = await api.get(`/repos/${repository.repoFullName}/branches/${encodeURIComponent(branch)}`);
  const afterSha = branchInfo.commit.sha;
  const beforeSha = repository.lastAnalyzedCommitSha;
  if (!beforeSha || beforeSha === afterSha) return null;

  const { data: comparison } = await api.get(`/repos/${repository.repoFullName}/compare/${beforeSha}...${afterSha}`);
  const changedFiles = (comparison.files || []).map(file => file.filename);
  const latestMessage = comparison.commits?.[comparison.commits.length - 1]?.commit.message || 'Repository updated';
  const snapshot = await fetchRepositorySnapshot(user, repository);
  const changedFileSet = new Set(changedFiles);
  const changedData = snapshot.files.filter(file => changedFileSet.has(file.path));
  const impacted = affectedSkills(changedFiles, changedData);
  const change = await RepositoryChange.create({
    repository: repository._id,
    user: user._id,
    beforeSha,
    afterSha,
    commitMessage: latestMessage,
    changedFiles,
    affectedSkills: impacted,
    reassessmentStatus: 'reassessing'
  });

  try {
    const jobs = await Job.find({ user: user._id, analysisStatus: { $in: ['ready', 'assessed'] } });
    for (const job of jobs) {
      const relevant = impacted.filter(skill => [...job.requiredSkills, ...job.preferredSkills].some(item => item.toLowerCase() === skill.toLowerCase()));
      if (!relevant.length) continue;
      await assessSkills({ user, job, repository, snapshot, onlySkills: relevant });
      await refreshGaps(user, job, relevant);
    }
    repository.lastAnalyzedCommitSha = afterSha;
    repository.lastAnalyzedAt = new Date();
    repository.status = 'analyzed';
    await repository.save();
    change.reassessmentStatus = 'complete';
    await change.save();
    return change;
  } catch (error) {
    change.reassessmentStatus = 'failed';
    await change.save();
    throw error;
  }
}

module.exports = { detectAndReassess };
