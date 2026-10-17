const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
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
  return jwt.sign({ sub: String(user._id), version: user.tokenVersion || 0 }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function register({ name, email, password }) {
  const existing = await User.exists({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('An account already exists with this email. Sign in instead.');
    error.status = 409;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ name, email: email.toLowerCase(), passwordHash });
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error('An account already exists with this email. Sign in instead.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
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

async function requestPasswordReset(email) {
  if (!env.passwordResetConfigured) {
    const error = new Error('Password reset email is not configured yet. Contact support or try again later.');
    error.status = 503;
    throw error;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return;
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const resetUrl = new URL('/reset-password', env.CLIENT_URL);
  resetUrl.searchParams.set('token', token);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [user.email],
        subject: 'Reset your SkillProof password',
        text: `Use this link to reset your SkillProof password. It expires in 30 minutes: ${resetUrl.toString()}`,
        html: `<p>Use the link below to reset your SkillProof password. It expires in 30 minutes.</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`
      })
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  } catch (error) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    logger.error('Password reset email could not be delivered', { message: error.message });
    const deliveryError = new Error('We could not send the reset email. Please try again later.');
    deliveryError.status = 503;
    throw deliveryError;
  }
}

async function resetPassword(token, password) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } })
    .select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) {
    const error = new Error('This password reset link is invalid or expired. Request a new one.');
    error.status = 400;
    throw error;
  }
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  return { user: publicUser(user), token: issueToken(user) };
}

module.exports = { register, login, publicUser, issueToken, requestPasswordReset, resetPassword };
