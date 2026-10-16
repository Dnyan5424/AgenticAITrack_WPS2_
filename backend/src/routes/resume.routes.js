const express = require('express');
const { z } = require('zod');
const resume = require('../controllers/resume.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();

router.use(authenticate);
router.post('/analyze', validate(z.object({ body: z.object({ text: z.string().trim().min(20).max(50000) }) })), resume.analyze);

module.exports = router;
