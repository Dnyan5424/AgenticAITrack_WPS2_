const express = require('express');
const { z } = require('zod');
const change = require('../controllers/change.controller');
const skill = require('../controllers/skill.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();

router.use(authenticate);
router.get('/changes', change.list);
router.get('/changes/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), change.get);
router.get('/analysis/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), skill.analysis);
router.get('/analysis/:id/status', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), change.status);

module.exports = router;
