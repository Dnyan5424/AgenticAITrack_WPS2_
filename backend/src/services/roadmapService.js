const LearningRoadmap = require('../models/LearningRoadmap');
const GapReport = require('../models/GapReport');

async function getOrCreate(user, job) {
  let roadmap = await LearningRoadmap.findOne({ user: user._id, job: job._id });
  if (roadmap) return roadmap;
  const gaps = await GapReport.find({ user: user._id, job: job._id }).sort({ gapLevel: 1 }).limit(10);
  const steps = gaps.map((gap, index) => ({
    title: `Add evidence for ${gap.skill}`,
    description: gap.recommendation,
    skill: gap.skill,
    evidenceToAdd: gap.missingEvidence.join('; ') || gap.suggestedProject,
    completed: false
  }));
  roadmap = await LearningRoadmap.create({
    user: user._id,
    job: job._id,
    title: `${job.title} evidence roadmap`,
    durationDays: steps.length > 4 ? 30 : 7,
    steps
  });
  return roadmap;
}

module.exports = { getOrCreate };
