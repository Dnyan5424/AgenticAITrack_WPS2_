const express = require('express');
const { z } = require('zod');
const repository = require('../controllers/repository.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();
const idParams = validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) }));

router.use(authenticate);
router.get('/', repository.list);
router.get('/:id/commits', idParams, repository.commits);
router.get('/:id/files', idParams, repository.files);
router.post('/:id/analyze', idParams, repository.analyze);
router.post('/:id/sync', idParams, repository.sync);
router.get('/:id', idParams, repository.get);

module.exports = router;
