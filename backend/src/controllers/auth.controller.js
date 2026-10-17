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

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  success(res, null, 'If an account exists for that email, a password reset link has been sent.');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  success(res, await authService.resetPassword(req.body.token, req.body.password), 'Password updated.');
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const { deleteUserData } = require('../services/accountDataService');
  await deleteUserData(req.user._id);
  success(res, null, 'Account deleted.');
});
