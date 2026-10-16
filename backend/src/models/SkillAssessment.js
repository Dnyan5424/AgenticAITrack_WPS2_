const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
  skill: { type: String, required: true, trim: true },
  status: { type: String, enum: ['demonstrated', 'partial', 'not_demonstrated_in_this_scope'], required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
  reason: { type: String, required: true },
  gap: { type: String, default: '' },
  analyzedCommitSha: { type: String, default: null }
}, { timestamps: true });
assessmentSchema.index({ user: 1, job: 1, repository: 1, skill: 1 }, { unique: true });
assessmentSchema.index({ user: 1, job: 1, skill: 1 });

module.exports = mongoose.model('SkillAssessment', assessmentSchema);
