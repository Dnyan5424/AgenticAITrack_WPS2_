const mongoose = require('mongoose');

const repositoryChangeSchema = new mongoose.Schema({
  repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  beforeSha: { type: String, required: true },
  afterSha: { type: String, required: true },
  commitMessage: { type: String, default: '' },
  changedFiles: [{ type: String }],
  affectedSkills: [{ type: String }],
  detectedAt: { type: Date, default: Date.now },
  reassessmentStatus: { type: String, enum: ['pending', 'reassessing', 'complete', 'failed'], default: 'pending' }
}, { timestamps: true });
repositoryChangeSchema.index({ user: 1, detectedAt: -1 });

module.exports = mongoose.model('RepositoryChange', repositoryChangeSchema);
