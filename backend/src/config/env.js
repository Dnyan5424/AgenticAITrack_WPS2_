const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

// Accept both the project-specific MONGO_URI and the common MONGODB_URI name.
// MONGO_URI takes precedence when both are set.
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().default(mongoUri || 'mongodb://127.0.0.1:27017/skillproof'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().default('http://localhost:5000/api/github/callback'),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WATCHER_ENABLED: z.enum(['true', 'false']).default('true')
});

const parsed = schema.safeParse({ ...process.env, MONGO_URI: mongoUri });
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map(x => x.path.join('.') + ': ' + x.message).join('; ')}`);
}

const env = parsed.data;
env.githubConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
env.geminiConfigured = Boolean(env.GEMINI_API_KEY);
module.exports = env;
