const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const AIConversation = require('../models/AIConversation');
const PersonalizedRoadmap = require('../models/PersonalizedRoadmap');
const { buildCareerContext } = require('../services/aiContextService');
const { askMentor, generateRoadmap } = require('../services/geminiService');

const router = express.Router();
router.use(authenticate);
router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many AI requests. Please try again shortly.' }
}));

router.get('/conversations', asyncHandler(async (req, res) => {
  const conversations = await AIConversation.find({ user: req.user._id })
    .select('title createdAt updatedAt').sort({ updatedAt: -1 }).limit(30).lean();
  success(res, { conversations });
}));

router.get('/conversations/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) })), asyncHandler(async (req, res) => {
  const conversation = await AIConversation.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  success(res, { conversation });
}));

router.delete('/conversations/:id', validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) })), asyncHandler(async (req, res) => {
  const result = await AIConversation.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Conversation not found.' });
  success(res, null, 'Conversation deleted.');
}));

router.post('/chat', validate(z.object({ body: z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  context: z.string().max(2000).optional().default('')
}) })), asyncHandler(async (req, res) => {
  const { message, conversationId, context: userContext } = req.validated.body;
  let conversation = conversationId
    ? await AIConversation.findOne({ _id: conversationId, user: req.user._id })
    : null;
  if (conversationId && !conversation) return res.status(404).json({ message: 'Conversation not found.' });
  if (!conversation) conversation = new AIConversation({ user: req.user._id, title: message.slice(0, 70), messages: [] });

  const verifiedContext = await buildCareerContext(req.user._id);
  const history = conversation.messages.slice(-12).map(item => ({ role: item.role, text: item.text }));
  let reply;
  try {
    reply = await askMentor({ history, message, context: `${verifiedContext}\n\nUser-provided context (unverified): ${userContext || 'none'}`.slice(0, 11000) });
  } catch (error) {
    logger.warn('AI mentor request failed', { message: error.message, status: error.status || null });
    if (!error.status) error.status = 502;
    throw error;
  }
  conversation.messages.push({ role: 'user', text: message }, { role: 'model', text: reply });
  conversation.messages = conversation.messages.slice(-40);
  await conversation.save();
  success(res, { conversationId: String(conversation._id), reply });
}));

const roadmapInput = z.object({
  goal: z.string().trim().min(1).max(180),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).default(7),
  durationWeeks: z.coerce.number().int().min(1).max(12).default(6),
  skillsToImprove: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  context: z.string().max(2000).optional().default('')
});

router.post('/roadmaps/generate', validate(z.object({ body: roadmapInput })), asyncHandler(async (req, res) => {
  const input = req.validated.body;
  const verifiedContext = await buildCareerContext(req.user._id);
  let generated;
  try {
    generated = await generateRoadmap({ ...input, verifiedContext });
  } catch (error) {
    logger.warn('AI roadmap generation failed', { message: error.message, status: error.status || null });
    if (!error.status) error.status = 502;
    throw error;
  }
  const roadmap = await PersonalizedRoadmap.create({ user: req.user._id, ...input, ...generated, active: true });
  await PersonalizedRoadmap.updateMany({ user: req.user._id, _id: { $ne: roadmap._id }, active: true }, { $set: { active: false } });
  success(res, { roadmap }, 'Roadmap generated.', 201);
}));

router.get('/roadmaps/current', asyncHandler(async (req, res) => {
  const roadmap = await PersonalizedRoadmap.findOne({ user: req.user._id, active: true }).sort({ updatedAt: -1 });
  success(res, { roadmap });
}));

router.patch('/roadmaps/:roadmapId/tasks/:taskId', validate(z.object({
  params: z.object({ roadmapId: z.string().regex(/^[a-f\d]{24}$/i), taskId: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z.object({ status: z.enum(['todo', 'in_progress', 'completed']) })
})), asyncHandler(async (req, res) => {
  const roadmap = await PersonalizedRoadmap.findOne({ _id: req.params.roadmapId, user: req.user._id, active: true });
  if (!roadmap) return res.status(404).json({ message: 'Roadmap not found.' });
  const task = roadmap.weeks.flatMap(week => week.tasks).find(item => String(item._id) === req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  task.status = req.validated.body.status;
  await roadmap.save();
  success(res, { roadmap });
}));

module.exports = router;
