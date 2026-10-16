const { githubClient } = require('../config/github');

const MAX_FILES = 120;
const MAX_FILE_BYTES = 64 * 1024;
const SKIP_DIRS = /(^|\/)(node_modules|vendor|dist|build|coverage|\.git|\.next)\//i;
const PRIORITY = /(^|\/)(readme|package\.json|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle|dockerfile|docker-compose|\.github\/workflows|.*\.(test|spec)\.)/i;

function ensureToken(user) {
  if (!user.githubAccessToken) {
    const error = new Error('Connect a GitHub account before accessing repositories');
    error.status = 409;
    throw error;
  }
  return githubClient(user.githubAccessToken);
}

async function listRepositories(user) {
  const api = ensureToken(user);
  const { data } = await api.get('/user/repos', { params: { per_page: 100, sort: 'updated', affiliation: 'owner,collaborator,organization_member' } });
  return data.map(repo => ({
    id: String(repo.id),
    repoFullName: repo.full_name,
    name: repo.name,
    repoUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    primaryLanguage: repo.language,
    isPrivate: repo.private,
    description: repo.description || ''
  }));
}

async function getRepository(user, repoFullName) {
  const api = ensureToken(user);
  const { data } = await api.get(`/repos/${repoFullName}`);
  return data;
}

async function fetchRepositorySnapshot(user, repository) {
  const api = ensureToken(user);
  const ownerRepo = repository.repoFullName;
  const { data: repo } = await api.get(`/repos/${ownerRepo}`);
  const branch = repo.default_branch || repository.defaultBranch;
  const { data: branchInfo } = await api.get(`/repos/${ownerRepo}/branches/${encodeURIComponent(branch)}`);
  const commitSha = branchInfo.commit.sha;
  const { data: treeData } = await api.get(`/repos/${ownerRepo}/git/trees/${commitSha}`, { params: { recursive: 1 } });
  const entries = treeData.tree.filter(item => item.type === 'blob' && item.size <= MAX_FILE_BYTES && !SKIP_DIRS.test(item.path));
  entries.sort((a, b) => Number(PRIORITY.test(b.path)) - Number(PRIORITY.test(a.path)));
  const files = [];
  for (const entry of entries.slice(0, MAX_FILES)) {
    try {
      const { data: blob } = await api.get(`/repos/${ownerRepo}/git/blobs/${entry.sha}`);
      if (blob.encoding !== 'base64') continue;
      files.push({
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
        content: Buffer.from(blob.content, 'base64').toString('utf8').slice(0, MAX_FILE_BYTES),
        url: `https://github.com/${ownerRepo}/blob/${commitSha}/${entry.path.split('/').map(encodeURIComponent).join('/')}`
      });
    } catch (error) {
      if (error.response?.status === 404) continue;
      throw error;
    }
  }
  const { data: commits } = await api.get(`/repos/${ownerRepo}/commits`, { params: { per_page: 10 } });
  return {
    commitSha,
    branch,
    language: repo.language,
    files,
    commits: commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date || commit.commit.committer?.date,
      url: commit.html_url,
      files: []
    }))
  };
}

async function fetchCommitChanges(user, repository, afterSha, beforeSha) {
  const api = ensureToken(user);
  const comparison = beforeSha && beforeSha !== afterSha
    ? await api.get(`/repos/${repository.repoFullName}/compare/${beforeSha}...${afterSha}`)
    : await api.get(`/repos/${repository.repoFullName}/commits/${afterSha}`);
  const data = comparison.data;
  const changedFiles = (data.files || []).map(file => file.filename);
  return {
    changedFiles,
    commitMessage: data.commit?.message || data.commits?.[data.commits.length - 1]?.commit?.message || '',
    beforeSha: beforeSha || data.parents?.[0]?.sha || afterSha,
    afterSha
  };
}

module.exports = { listRepositories, getRepository, fetchRepositorySnapshot, fetchCommitChanges };
