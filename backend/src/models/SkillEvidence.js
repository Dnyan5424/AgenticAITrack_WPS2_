const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillAssessment', required: true, index: true },
  evidenceType: { type: String, enum: ['source', 'test', 'configuration', 'documentation', 'commit'], required: true },
  filePath: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  commitSha: { type: String, required: true },
  commitMessage: { type: String, default: '' },
  snippet: { type: String, maxlength: 1200, default: '' },
  explanation: { type: String, required: true }
}, { timestamps: true });
evidenceSchema.index({ assessment: 1, filePath: 1, commitSha: 1 }, { unique: true });

module.exports = mongoose.model('SkillEvidence', evidenceSchema);
