const express = require('express');
const { z } = require('zod');
const auth = require('../controllers/auth.controller');
const github = require('../controllers/github.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const authLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' }
});
const router = express.Router();

const registerSchema = z.object({ body: z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
}) });
const loginSchema = z.object({ body: z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
}) });

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.get('/me', authenticate, auth.me);
router.post('/logout', authenticate, auth.logout);
router.get('/github', github.startOAuth);

module.exports = router;
