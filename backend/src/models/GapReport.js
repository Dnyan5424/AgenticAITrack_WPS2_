const mongoose = require('mongoose');

const gapReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  skill: { type: String, required: true },
  gapLevel: { type: String, enum: ['critical', 'moderate', 'preferred', 'insufficient'], required: true },
  reason: { type: String, required: true },
  missingEvidence: [{ type: String }],
  recommendation: { type: String, required: true },
  suggestedProject: { type: String, default: '' }
}, { timestamps: true });
gapReportSchema.index({ user: 1, job: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model('GapReport', gapReportSchema);
