const axios = require('axios');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
});

function client(token) {
  if (!token) throw new Error('GitHub access token is required');
  return githubApi.create({ headers: { Authorization: `Bearer ${token}` } });
}

module.exports = { githubApi, githubClient: client };
