const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skill: { type: String, required: true },
  evidenceToAdd: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { _id: true });

const roadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  title: { type: String, required: true },
  durationDays: { type: Number, min: 1, default: 30 },
  steps: [stepSchema]
}, { timestamps: true });
roadmapSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('LearningRoadmap', roadmapSchema);
