const express = require('express');
const { z } = require('zod');
const job = require('../controllers/job.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();

router.use(authenticate);
router.post('/analyze', validate(z.object({ body: z.object({
  text: z.string().trim().min(30).max(50000),
  url: z.union([z.string().url(), z.literal('')]).optional(),
  title: z.string().trim().min(1).max(150).optional(),
  company: z.string().trim().max(150).optional()
}) })), job.analyze);
router.get('/', job.list);
router.get('/:id/report', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), job.report);
router.post('/:id/assess', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), job.assess);
router.get('/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), async (req, res, next) => {
  try {
    const found = await job.getOwnedJob(req.params.id, req.user);
    const { success } = require('../utils/apiResponse');
    success(res, {
      id: String(found._id), title: found.title, company: found.company, sourceUrl: found.sourceUrl,
      requirements: [...found.requiredSkills.map(name => ({ name, required: true })), ...found.preferredSkills.map(name => ({ name, required: false }))],
      analysisStatus: found.analysisStatus
    });
  } catch (error) { next(error); }
});

module.exports = router;
