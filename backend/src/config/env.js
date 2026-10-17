const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

// Accept both the project-specific MONGO_URI and the common MONGODB_URI name.
// MONGO_URI takes precedence when both are set.
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
const backendUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().default(mongoUri || 'mongodb://127.0.0.1:27017/skillproof'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url().default(clientUrl || 'http://localhost:5173'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().default(`${backendUrl}/api/github/callback`),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  REPO_MAX_FILES: z.coerce.number().int().min(1).max(300).default(120),
  REPO_MAX_FILE_BYTES: z.coerce.number().int().min(65536).max(10 * 1024 * 1024).default(1024 * 1024),
  REPO_MAX_SNAPSHOT_BYTES: z.coerce.number().int().min(1024 * 1024).max(50 * 1024 * 1024).default(12 * 1024 * 1024),
  AI_EVIDENCE_MAX_FILES: z.coerce.number().int().min(1).max(20).default(6),
  AI_EVIDENCE_SNIPPET_CHARS: z.coerce.number().int().min(200).max(3000).default(1200),
  AI_CONTEXT_MAX_CHARS: z.coerce.number().int().min(1000).max(30000).default(12000),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WATCHER_ENABLED: z.enum(['true', 'false']).default('true')
});

const parsed = schema.safeParse({ ...process.env, MONGO_URI: mongoUri, CLIENT_URL: clientUrl });
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(x => x.path.join('.') + ': ' + x.message).join('; ')}`);
}

const env = parsed.data;
env.githubConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
env.geminiConfigured = Boolean(env.GEMINI_API_KEY);
env.passwordResetConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
module.exports = env;
