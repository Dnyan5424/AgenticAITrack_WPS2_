const express = require('express');
const skill = require('../controllers/skill.controller');
const job = require('../controllers/job.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { z } = require('zod');
const router = express.Router();

router.use(authenticate);
router.get('/career-dna', skill.careerDna);
router.get('/skills', skill.list);
router.get('/skills/:skill/evidence', skill.evidence);
router.get('/gap-reports/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) })), job.gapReport);

module.exports = router;
