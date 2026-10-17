const { githubClient } = require('../config/github');
const env = require('../config/env');

// Keep repository analysis bounded while allowing moderately large source files.
const MAX_FILES = env.REPO_MAX_FILES;
const MAX_FILE_BYTES = env.REPO_MAX_FILE_BYTES;
const MAX_SNAPSHOT_BYTES = env.REPO_MAX_SNAPSHOT_BYTES;
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

function isPublicRepository(repo) {
  return repo.private === false;
}

function assertPublicRepository(repo) {
  if (!isPublicRepository(repo)) {
    const error = new Error('Only public GitHub repositories are supported');
    error.status = 403;
    throw error;
  }
}

async function listRepositories(user) {
  const api = ensureToken(user);
  const { data } = await api.get('/user/repos', { params: { per_page: 100, sort: 'updated', visibility: 'public', affiliation: 'owner,collaborator,organization_member' } });
  return data.filter(isPublicRepository).map(repo => ({
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
  assertPublicRepository(data);
  return data;
}

async function fetchRepositorySnapshot(user, repository, { priorityPaths = [] } = {}) {
  if (repository.isPrivate) {
    const error = new Error('Only public GitHub repositories are supported');
    error.status = 403;
    throw error;
  }
  const repo = await getRepository(user, repository.repoFullName);
  const api = ensureToken(user);
  const ownerRepo = repository.repoFullName;
  const branch = repo.default_branch || repository.defaultBranch;
  const { data: branchInfo } = await api.get(`/repos/${ownerRepo}/branches/${encodeURIComponent(branch)}`);
  const commitSha = branchInfo.commit.sha;
  const { data: treeData } = await api.get(`/repos/${ownerRepo}/git/trees/${commitSha}`, { params: { recursive: 1 } });
  const entries = treeData.tree.filter(item => item.type === 'blob' && item.size <= MAX_FILE_BYTES && !SKIP_DIRS.test(item.path));
  const changedPathSet = new Set(priorityPaths);
  entries.sort((a, b) =>
    Number(changedPathSet.has(b.path)) - Number(changedPathSet.has(a.path)) ||
    Number(PRIORITY.test(b.path)) - Number(PRIORITY.test(a.path)) ||
    a.path.localeCompare(b.path)
  );
  const files = [];
  let snapshotBytes = 0;
  for (const entry of entries.slice(0, MAX_FILES)) {
    if (snapshotBytes + entry.size > MAX_SNAPSHOT_BYTES) continue;
    try {
      const { data: blob } = await api.get(`/repos/${ownerRepo}/git/blobs/${entry.sha}`);
      if (blob.encoding !== 'base64') continue;
      const bytes = Buffer.from(blob.content, 'base64');
      // Binary files cannot provide useful text evidence and can contain invalid UTF-8.
      if (bytes.includes(0)) continue;
      snapshotBytes += bytes.length;
      files.push({
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
        content: bytes.toString('utf8'),
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
    analysisScope: {
      maxFiles: MAX_FILES,
      maxFileBytes: MAX_FILE_BYTES,
      maxSnapshotBytes: MAX_SNAPSHOT_BYTES,
      analyzedFiles: files.length,
      omittedLargeFiles: treeData.tree.filter(item => item.type === 'blob' && item.size > MAX_FILE_BYTES && !SKIP_DIRS.test(item.path)).length
    },
    commits: commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date || commit.commit.committer?.date,
      url: commit.html_url,
      files: []
    }))
  };
}

async function fetchRecentCommits(user, repository) {
  if (repository.isPrivate) {
    const error = new Error('Only public GitHub repositories are supported');
    error.status = 403;
    throw error;
  }
  await getRepository(user, repository.repoFullName);
  const api = ensureToken(user);
  const { data: commits } = await api.get(`/repos/${repository.repoFullName}/commits`, { params: { per_page: 10 } });
  return commits.map(commit => ({
    sha: commit.sha,
    message: commit.commit.message,
    date: commit.commit.author?.date || commit.commit.committer?.date,
    url: commit.html_url,
    files: []
  }));
}

async function fetchCommitChanges(user, repository, afterSha, beforeSha) {
  if (repository.isPrivate) {
    const error = new Error('Only public GitHub repositories are supported');
    error.status = 403;
    throw error;
  }
  await getRepository(user, repository.repoFullName);
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

module.exports = { listRepositories, getRepository, fetchRepositorySnapshot, fetchRecentCommits, fetchCommitChanges, assertPublicRepository, isPublicRepository };
