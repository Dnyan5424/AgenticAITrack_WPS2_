# SkillProof — Frontend

Agentic AI career-intelligence frontend: **real job → GitHub evidence → gaps → new commit → selective reassessment → updated assessment.**
React 18 · TypeScript · Vite · Tailwind · React Router · Axios · Framer Motion · Recharts · Lucide.

## Run
```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm run build
```

## Demo flow (mock mode, `VITE_USE_MOCK=true`)
1. Landing → **Connect GitHub** (simulated account, clearly labelled).
2. **Job Analyzer** → *Load sample job* (or paste text) → **Run assessment**.
3. Review **Job Fit Report**, **Evidence Explorer**, **Gap Report** (SQL and Automated testing are *not demonstrated in this scope*).
4. **Change Activity** → **Simulate new commit**: SQL and testing go *Under review*, then update; other skills stay unchanged; fit score recalculates.

All sample data is illustrative; no external links are fabricated.

## Connect the Express backend
1. Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:5000/api`.
2. Services in `src/services/*` already call the contract endpoints listed in `src/api/endpoints.ts`
   (`/auth/github`, `/github/repositories`, `/jobs/analyze`, `/career-dna`, `/changes`, `/roadmaps/:jobId`, `/resume/analyze`, ...).
3. Responses must be `{ "data": <payload>, "message"?: string }` matching `src/types`.
4. Enable CORS with credentials for the Vite origin. Real change detection (webhooks) and AI belong to the backend.
The OAuth callback now hydrates the authenticated user, connection status, and public repository list. Job analysis and the rest of the live-data UI still need backend-specific state wiring; mock mode remains the complete demo experience.

### GitHub OAuth session
The OAuth callback returns to the frontend with a JWT in the URL fragment. The frontend consumes it into `sessionStorage`, removes it from the visible URL, and sends it as a Bearer token on API requests. After the redirect, it loads `/auth/me`, `/github/connection`, and `/github/repositories`. Set the GitHub OAuth callback URL to the backend's `/api/github/callback`, and set the backend `CLIENT_URL` to this frontend's origin.
