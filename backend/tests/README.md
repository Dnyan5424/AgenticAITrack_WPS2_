# SkillProof Backend

Modular Express/MongoDB API for evidence-backed career intelligence. The API uses GitHub REST API v3 to inspect configured repositories and their commit history, maps direct evidence to job skills, and preserves unaffected assessments when a repository changes.

## Requirements and setup

- Node.js 18+
- MongoDB 6+ (local or hosted)
- Optional: GitHub OAuth app and Gemini API key

```powershell
cd skillproof-backend
npm install
Copy-Item .env.example .env
```

Set `JWT_SECRET` to a long random value in `.env`. Set `MONGO_URI` for your MongoDB instance. Then run:

```powershell
npm run dev
```

The API listens on `http://localhost:5000`; health and integration readiness are at `http://localhost:5000/api/health`. Production startup requires an explicit `JWT_SECRET` of at least 32 characters. The process will report MongoDB connection failures and will not falsely start without a database.

## Optional integrations

The server starts with GitHub and Gemini credentials absent.

- **GitHub:** Create a GitHub OAuth app with callback URL `http://localhost:5000/api/github/callback`; configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI`. The OAuth flow requests repository read access and user email, validates a short-lived HttpOnly state cookie, and stores the token on the user document with Mongoose `select: false`. Add a push webhook pointing to `https://<public-host>/api/github/webhook` and configure `GITHUB_WEBHOOK_SECRET`. Webhooks use HMAC-SHA256 signature verification. When not configured, `/api/health` reports the missing settings and GitHub features return an explicit `503`.
- **Gemini:** `GEMINI_API_KEY` enables evidence-constrained explanation wording. Deterministic evidence extraction and status decisions remain available without it. AI output receives only observed excerpts and cannot create evidence records; extraction failure is logged and falls back to deterministic explanations.
- **Watcher:** `WATCHER_ENABLED=true` (default) polls analyzed repositories every 15 minutes. A webhook can also initiate processing. No changes are simulated.

## API contract

Except authentication redirects, errors, and `/api/health`, successful JSON responses use `{ "data": ..., "message"?: "..." }`. Private routes require `Authorization: Bearer <JWT>`. Every job, repository, assessment, change, roadmap, and resume claim query is scoped to the authenticated user. The JWT is stateless: `POST /api/auth/logout` does not revoke it; the client must remove its token.

### Authentication

- `POST /api/auth/register` — `{ "name", "email", "password" }`; password must be at least eight characters.
- `POST /api/auth/login` — `{ "email", "password" }`.
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/github` — starts GitHub OAuth; callback redirects to the frontend with a token fragment.

### GitHub and repositories

- `GET /api/github/connection`
- `GET /api/github/repositories` — repositories visible to connected GitHub account.
- `POST /api/github/repositories/connect` — `{ "id": "<GitHub repository id>" }`.
- `DELETE /api/github/repositories/:id` — disconnect an owned configured repository.
- `GET /api/repositories/:id`, `GET /api/repositories/:id/files`
- `POST /api/repositories/:id/analyze`, `POST /api/repositories/:id/sync`
- `POST /api/github/webhook` — GitHub push webhook, authenticated by webhook signature rather than JWT.

Repository analysis reads the default branch tree, README/source/configuration/dependency/test files, and recent commit metadata. It excludes common generated/vendor directories and files over 64 KiB and caps one scan at 120 files. The API links evidence to actual GitHub file URLs at the analyzed commit and stores the commit SHA. GitHub API limits and access permissions apply; these are reported as errors rather than replaced with fabricated data.

### Jobs, skills, and reports

- `POST /api/jobs/analyze` — `{ "text", "url"?: "..." }`. The URL is recorded as a source reference; the backend does not fetch arbitrary URLs. The supplied job description is analyzed for supported skill names.
- `GET /api/jobs`, `GET /api/jobs/:id`
- `POST /api/jobs/:id/assess`, `GET /api/jobs/:id/report`
- `GET /api/gap-reports/:jobId`
- `GET /api/skills`, `GET /api/skills/:skill/evidence`, `GET /api/career-dna`
- `POST /api/resume/analyze` — `{ "text" }`

Assessments require direct matching evidence in fetched repository content. No match has the exact status `not_demonstrated_in_this_scope`, explained as **“Not demonstrated in this scope.”** It means only that the configured, analyzed repositories did not demonstrate the skill; it is not a conclusion about the person. Fit score is a transparent weighted evidence-coverage percentage, not a prediction or ability score.

### Changes and roadmaps

- `GET /api/changes`, `GET /api/changes/:id`
- `GET /api/analysis/:id`, `GET /api/analysis/:id/status`
- `GET /api/roadmaps/:jobId`
- `PATCH /api/roadmap/tasks/:taskId` — `{ "done": boolean }`

Changed files are mapped to likely affected skills. Only those skills are reassessed for each user's assessed jobs; evidence and gap reports for those skills are refreshed while other assessments are left untouched. A failed reassessment is recorded as failed, not reported as successful.

## Frontend integration

The existing React frontend remains separate and unchanged. Configure its environment:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:5000/api
```

CORS permits `CLIENT_URL` (default `http://localhost:5173`) with credentials.

Known contract gaps in the current frontend:

1. The UI status union currently uses `not_demonstrated`, while this API correctly returns the required `not_demonstrated_in_this_scope`. The UI must add that status when backend mode is enabled; this backend does not silently weaken or translate it.
2. The frontend OAuth helper redirects to `/api/auth/github`, but currently does not parse the returned `#token=...` fragment or store/send a JWT. Backend login, callback, and bearer-token endpoints work; completing live frontend authentication needs a frontend-side token handoff.
3. Frontend service types model roadmap/evidence/job payloads in mock-specific forms. The backend returns compatible identity/summary fields and evidence-backed structures, but components that rely on fields not included in their types may need explicit mapping once backend mode is activated.
4. The frontend currently seeds initial state through mock services (`AppContext`); switching `VITE_USE_MOCK=false` alone does not connect that mock initialization to authentication. The backend does not alter the frontend to hide this mismatch.

## Seed data and tests

No invented sample jobs or evidence are seeded. To create a job from a description you supply, set `SEED_USER_EMAIL` and `SEED_JOB_TEXT` in the environment (optional `SEED_JOB_TITLE`, `SEED_JOB_COMPANY`, `SEED_JOB_URL`) and run `npm run seed`. The user must already exist.

```powershell
npm test
```
