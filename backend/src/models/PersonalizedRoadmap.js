const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 180 },
  description: { type: String, required: true, maxlength: 2000 },
  estimatedMinutes: { type: Number, min: 10, max: 600, default: 60 },
  resourceUrl: { type: String, default: '', maxlength: 500 },
  exercise: { type: String, default: '', maxlength: 2000 },
  completionCriteria: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' }
}, { timestamps: true });

const weekSchema = new mongoose.Schema({
  week: { type: Number, required: true, min: 1, max: 12 },
  title: { type: String, required: true, maxlength: 180 },
  objective: { type: String, default: '', maxlength: 1000 },
  tasks: { type: [taskSchema], default: [] }
});

const roadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goal: { type: String, required: true, maxlength: 180 },
  currentLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  hoursPerWeek: { type: Number, min: 1, max: 80, default: 7 },
  durationWeeks: { type: Number, min: 1, max: 12, default: 6 },
  summary: { type: String, default: '', maxlength: 3000 },
  skillsToImprove: { type: [String], default: [] },
  weeks: { type: [weekSchema], default: [] },
  active: { type: Boolean, default: true }
}, { timestamps: true });

roadmapSchema.index({ user: 1, active: 1, updatedAt: -1 });
module.exports = mongoose.model('PersonalizedRoadmap', roadmapSchema);
