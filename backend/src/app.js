const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const apiLimiter = require('./middleware/rateLimit.middleware');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const githubRoutes = require('./routes/github.routes');
const jobRoutes = require('./routes/job.routes');
const skillRoutes = require('./routes/skill.routes');
const repositoryRoutes = require('./routes/repository.routes');
const changeRoutes = require('./routes/change.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const resumeRoutes = require('./routes/resume.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-GitHub-Event', 'X-Hub-Signature-256']
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); }
}));
app.use('/api', apiLimiter);
app.get('/api/health', (req, res) => res.json({
  data: {
    status: 'ok',
    integrations: {
      github: env.githubConfigured ? 'configured' : 'unconfigured',
      gemini: env.geminiConfigured ? 'configured' : 'unconfigured',
    },
    featuresRequiringConfiguration: [
      ...(!env.githubConfigured ? ['GitHub OAuth and private-repository access require GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET'] : []),
      ...(!env.geminiConfigured ? ['AI Mentor and personalized AI roadmaps require GEMINI_API_KEY; repository assessments use deterministic rules'] : []),
    ]
  }
}));
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', skillRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api', changeRoutes);
app.use('/api', roadmapRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});
app.use(errorHandler);

module.exports = app;
