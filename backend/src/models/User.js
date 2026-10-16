const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, select: false },
  githubUsername: { type: String, trim: true },
  githubAccessToken: { type: String, select: false },
  oauthStateHash: { type: String, select: false },
  oauthStateExpiresAt: { type: Date, select: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
