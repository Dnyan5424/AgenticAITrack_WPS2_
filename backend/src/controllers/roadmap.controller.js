const Job = require('../models/Job');
const LearningRoadmap = require('../models/LearningRoadmap');
const roadmapService = require('../services/roadmapService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, user: req.user._id });
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    throw error;
  }
  const roadmap = await roadmapService.getOrCreate(req.user, job);
  success(res, roadmap.steps.map(step => ({
    id: String(step._id),
    plan: roadmap.durationDays <= 7 ? '7-day' : '30-day',
    title: step.title,
    artifact: step.evidenceToAdd,
    skill: step.skill,
    done: step.completed
  })));
});

exports.toggleTask = asyncHandler(async (req, res) => {
  const roadmap = await LearningRoadmap.findOne({ user: req.user._id, 'steps._id': req.params.taskId });
  if (!roadmap) {
    const error = new Error('Roadmap task not found');
    error.status = 404;
    throw error;
  }
  const step = roadmap.steps.id(req.params.taskId);
  step.completed = req.body.done;
  await roadmap.save();
  success(res, { id: String(step._id), done: step.completed });
});
