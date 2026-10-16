const mongoose = require('mongoose');

const resumeClaimSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  claim: { type: String, required: true },
  evidenceStatus: { type: String, enum: ['supported', 'partial', 'not_demonstrated_in_this_scope'], required: true },
  explanation: { type: String, required: true },
  matchedSkills: [{ type: String }]
}, { timestamps: true });
resumeClaimSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeClaim', resumeClaimSchema);
