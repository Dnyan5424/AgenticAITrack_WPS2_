const express = require('express');
const { z } = require('zod');
const github = require('../controllers/github.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const router = express.Router();

router.get('/callback', github.callback);
router.post('/webhook', github.webhook);
router.use(authenticate);
router.get('/connection', github.connection);
router.get('/repositories', github.repositories);
router.post('/repositories/connect', validate(z.object({ body: z.object({ id: z.union([z.string(), z.number()]) }) })), github.connectRepository);
router.delete('/repositories/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\\d]{24}$/i) }) })), github.disconnectRepository);

module.exports = router;
