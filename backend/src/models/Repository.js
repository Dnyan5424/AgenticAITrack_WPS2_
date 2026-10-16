const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  repoFullName: { type: String, required: true, trim: true },
  repoUrl: { type: String, required: true },
  defaultBranch: { type: String, default: 'main' },
  primaryLanguage: { type: String, default: null },
  isPrivate: { type: Boolean, default: false },
  lastAnalyzedCommitSha: { type: String, default: null },
  lastAnalyzedAt: { type: Date, default: null },
  status: { type: String, enum: ['connected', 'pending', 'analyzing', 'analyzed', 'failed'], default: 'connected' }
}, { timestamps: true });
repositorySchema.index({ user: 1, repoFullName: 1 }, { unique: true });

module.exports = mongoose.model('Repository', repositorySchema);
