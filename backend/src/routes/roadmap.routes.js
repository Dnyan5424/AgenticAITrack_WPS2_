const express = require('express');
const { z } = require('zod');
const roadmap = require('../controllers/roadmap.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();

router.use(authenticate);
router.get('/roadmaps/:jobId', validate(z.object({ params: z.object({ jobId: z.string().regex(/^[a-f\\d]{24}$/i) }) })), roadmap.get);
router.patch('/roadmap/tasks/:taskId', validate(z.object({
  params: z.object({ taskId: z.string().regex(/^[a-f\\d]{24}$/i) }),
  body: z.object({ done: z.boolean() })
})), roadmap.toggleTask);

module.exports = router;
