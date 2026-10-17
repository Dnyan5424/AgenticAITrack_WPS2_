const User = require('../models/User');
const Repository = require('../models/Repository');
const RepositoryChange = require('../models/RepositoryChange');
const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');
const GapReport = require('../models/GapReport');
const LearningRoadmap = require('../models/LearningRoadmap');
const Job = require('../models/Job');
const ResumeClaim = require('../models/ResumeClaim');

async function deleteRepositoryData(userId) {
  const assessments = await SkillAssessment.find({ user: userId }).select('_id');
  const assessmentIds = assessments.map(item => item._id);
  await Promise.all([
    SkillEvidence.deleteMany({ assessment: { $in: assessmentIds } }),
    SkillAssessment.deleteMany({ _id: { $in: assessmentIds } }),
    RepositoryChange.deleteMany({ user: userId }),
    GapReport.deleteMany({ user: userId }),
    LearningRoadmap.deleteMany({ user: userId }),
    Repository.deleteMany({ user: userId })
  ]);
}

async function deleteUserData(userId) {
  await deleteRepositoryData(userId);
  await Promise.all([Job.deleteMany({ user: userId }), ResumeClaim.deleteMany({ user: userId })]);
  await User.deleteOne({ _id: userId });
}

module.exports = { deleteRepositoryData, deleteUserData };
