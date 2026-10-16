const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const authService = require('./authService');

function requireConfigured() {
  if (!env.githubConfigured) {
    const error = new Error('GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
    error.status = 503;
    throw error;
  }
}

function createAuthorization(state) {
  requireConfigured();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GITHUB_REDIRECT_URI);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return url.toString();
}

async function exchangeCode(code) {
  requireConfigured();
  const { data } = await axios.post('https://github.com/login/oauth/access_token', {
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: env.GITHUB_REDIRECT_URI
  }, { headers: { Accept: 'application/json' }, timeout: 15000 });
  if (!data.access_token) {
    const error = new Error(data.error_description || 'GitHub OAuth token exchange failed');
    error.status = 401;
    throw error;
  }
  return data.access_token;
}

async function completeLogin(code) {
  const accessToken = await exchangeCode(code);
  const gh = axios.create({ baseURL: 'https://api.github.com', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }, timeout: 15000 });
  const [{ data: profile }, { data: emails }] = await Promise.all([
    gh.get('/user'),
    gh.get('/user/emails')
  ]);
  const email = emails.find(item => item.primary && item.verified)?.email;
  if (!email) {
    const error = new Error('A verified primary GitHub email is required to create or connect an account');
    error.status = 400;
    throw error;
  }
  let user = await User.findOne({ $or: [{ githubUsername: profile.login }, { email: email.toLowerCase() }] }).select('+githubAccessToken');
  if (!user) {
    const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    user = new User({ name: profile.name || profile.login, email: email.toLowerCase(), passwordHash: unusablePassword });
  } else if (user.githubUsername && user.githubUsername !== profile.login && user.email !== email.toLowerCase()) {
    const error = new Error('GitHub identity is already linked to another account');
    error.status = 409;
    throw error;
  }
  user.githubUsername = profile.login;
  user.githubAccessToken = accessToken;
  await user.save();
  return { user: authService.publicUser(user), token: authService.issueToken(user) };
}

module.exports = { createAuthorization, completeLogin };
