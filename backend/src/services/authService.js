const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    githubLogin: user.githubUsername || undefined,
    demo: false
  };
}

function issueToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function register({ name, email, password }) {
  const existing = await User.exists({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.status = 409;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
  return { user: publicUser(user), token: issueToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const valid = user && user.passwordHash && await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error('Email or password is incorrect');
    error.status = 401;
    throw error;
  }
  return { user: publicUser(user), token: issueToken(user) };
}

module.exports = { register, login, publicUser, issueToken };
