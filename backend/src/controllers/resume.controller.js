const resumeService = require('../services/resumeService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.analyze = asyncHandler(async (req, res) => {
  success(res, await resumeService.analyzeResume(req.user, req.body.text));
});
