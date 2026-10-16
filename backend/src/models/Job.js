const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  company: { type: String, default: 'Not detected', trim: true },
  sourceUrl: { type: String, default: '' },
  rawDescription: { type: String, required: true, maxlength: 50000 },
  requiredSkills: [{ type: String, trim: true }],
  preferredSkills: [{ type: String, trim: true }],
  analysisStatus: { type: String, enum: ['pending', 'ready', 'assessing', 'assessed', 'failed'], default: 'ready' }
}, { timestamps: true });
jobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
