const authService = require('../services/authService');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  success(res, result, 'Account created', 201);
});

exports.login = asyncHandler(async (req, res) => {
  success(res, await authService.login(req.body), 'Signed in');
});

exports.me = asyncHandler(async (req, res) => {
  success(res, authService.publicUser(req.user));
});

exports.logout = asyncHandler(async (req, res) => {
  success(res, null, 'Signed out. Remove the bearer token in the client; JWTs are stateless and are not revoked by this endpoint.');
});
