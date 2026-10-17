import type { JobPosting, Repository, SkillAssessment, RoadmapTask, Commit, RepositoryFile } from '../types'
const iso = (d = 0) => new Date(Date.now() - d * 36e5).toISOString()
export const DEMO_USER = { id: 'demo', name: 'Student', email: 'demo@skillproof.local', githubLogin: 'demo-student', demo: true }
export const seedRepo = (): Repository => ({
  id: 'r1', name: 'campus-orders-api', language: 'Python', branch: 'main', latestSha: 'c41d9e7', analyzedSha: 'c41d9e7', analyzedAt: iso(2),
  description: 'REST API and React dashboard for campus canteen orders.',
  files: [
    { path: 'app/routes/orders.py', kind: 'source', excerpt: '@router.post("/orders")\nasync def create_order(payload: OrderIn):\n    return service.create(payload)', explanation: 'REST endpoints with request validation demonstrate API development.' },
    { path: 'src/App.tsx', kind: 'source', excerpt: 'export default function App() {\n  const [orders, setOrders] = useState<Order[]>([])', explanation: 'React component with hooks.' },
    { path: 'src/components/Navbar.tsx', kind: 'source', excerpt: 'export const Navbar = () => <nav>…</nav>', explanation: 'Reusable React component.' },
    { path: 'Dockerfile', kind: 'deploy', excerpt: 'FROM python:3.12-slim\nCMD ["uvicorn","app.main:app"]', explanation: 'Container config shows partial deployment evidence; no CI pipeline found.' },
    { path: 'README.md', kind: 'doc', excerpt: '# Campus Orders API\nRun with docker compose up', explanation: 'Setup documentation.' }],
  commits: [{ sha: 'c41d9e7', message: 'Add Dockerfile and README', date: iso(2), files: ['Dockerfile', 'README.md'] }, { sha: 'b02a117', message: 'Build orders endpoints', date: iso(30), files: ['app/routes/orders.py'] }, { sha: 'a7710cf', message: 'Scaffold React dashboard', date: iso(70), files: ['src/App.tsx', 'src/components/Navbar.tsx'] }] })
export const seedRepos = (): Repository[] => {
  const orders = seedRepo()
  const portfolio: Repository = {
    ...orders,
    id: 'r2',
    name: 'career-portfolio-web',
    language: 'TypeScript',
    latestSha: 'd8ab204',
    analyzedSha: 'd8ab204',
    description: 'Portfolio and career dashboard.',
    files: [
      { path: 'src/pages/Profile.tsx', kind: 'source', excerpt: 'export function Profile() { return <main>Career profile</main> }', explanation: 'TypeScript React page component.' },
      { path: 'src/api/client.ts', kind: 'source', excerpt: 'export async function getProfile() { return fetch("/api/profile") }', explanation: 'Client-side API request.' },
      { path: 'tests/profile.test.tsx', kind: 'test', excerpt: 'it("renders profile details", () => render(<Profile />))', explanation: 'Component test for profile rendering.' }
    ],
    commits: [
      { sha: 'd8ab204', message: 'Add profile dashboard and tests', date: iso(4), files: ['src/pages/Profile.tsx', 'tests/profile.test.tsx'] },
      { sha: 'ab31c69', message: 'Connect profile API client', date: iso(38), files: ['src/api/client.ts'] }
    ]
  }
  const analytics: Repository = {
    ...orders,
    id: 'r3',
    name: 'sales-insights-notebook',
    language: 'Python',
    latestSha: 'f73ca10',
    analyzedSha: 'f73ca10',
    description: 'Python data analysis and SQL reports.',
    files: [
      { path: 'analysis/revenue.py', kind: 'source', excerpt: 'monthly = orders.groupby("month")["total"].sum()', explanation: 'Python data aggregation for monthly revenue.' },
      { path: 'sql/top_products.sql', kind: 'sql', excerpt: 'SELECT product, SUM(quantity) FROM orders GROUP BY product;', explanation: 'SQL aggregation for product reporting.' },
      { path: 'README.md', kind: 'doc', excerpt: '# Sales insights\\nMonthly revenue and product reports.', explanation: 'Project and report documentation.' }
    ],
    commits: [
      { sha: 'f73ca10', message: 'Add monthly revenue analysis', date: iso(7), files: ['analysis/revenue.py'] },
      { sha: 'c45ef80', message: 'Add product summary query', date: iso(42), files: ['sql/top_products.sql'] }
    ]
  }
  return [orders, portfolio, analytics]
}
const ev = (file: string, excerpt: string, explanation: string, commit: string): SkillAssessment['evidence'][number] => ({ repo: 'campus-orders-api', file, excerpt, explanation, commit })
const sk = (name: string, category: string, status: SkillAssessment['status'], confidence: number, evidence: SkillAssessment['evidence'], extra: Partial<SkillAssessment> = {}): SkillAssessment => ({ name, category, status, confidence, evidence, updatedAt: iso(2), ...extra })
export const seedSkills = (): SkillAssessment[] => [
  sk('API development', 'Backend', 'demonstrated', 0.9, [ev('app/routes/orders.py', '@router.post("/orders")', 'Validated REST endpoints with typed payloads.', 'b02a117')]),
  sk('Python', 'Backend', 'demonstrated', 0.88, [ev('app/routes/orders.py', 'async def create_order(payload: OrderIn)', 'Idiomatic typed Python across the service layer.', 'b02a117')]),
  sk('React', 'Frontend', 'demonstrated', 0.84, [ev('src/App.tsx', 'const [orders, setOrders] = useState<Order[]>([])', 'Hooks-based component state.', 'a7710cf'), ev('src/components/Navbar.tsx', 'export const Navbar = () => <nav>…</nav>', 'Reusable component structure.', 'a7710cf')]),
  sk('Docker', 'Deployment', 'partial', 0.6, [ev('Dockerfile', 'FROM python:3.12-slim', 'Container image exists; no compose or registry push seen.', 'c41d9e7')], { gap: 'Dockerfile found but no multi-service setup or deployment target.', improvement: 'Add docker-compose.yml and a deploy script.' }),
  sk('Git', 'Tooling', 'demonstrated', 0.7, [ev('README.md', '3 commits with descriptive messages', 'Readable commit history.', 'c41d9e7')]),
  sk('SQL', 'Data', 'not_demonstrated', 0.2, [], { gap: 'No .sql files or query code found in the analyzed scope.', improvement: 'Add db/queries.sql with joins and aggregations used by the API.' }),
  sk('Automated testing', 'Quality', 'not_demonstrated', 0.2, [], { gap: 'No test files found in the analyzed scope.', improvement: 'Add tests/test_api.py covering the orders endpoints.' }),
  sk('CI/CD', 'Deployment', 'not_demonstrated', 0.15, [], { gap: 'No workflow files found in the analyzed scope.', improvement: 'Add .github/workflows/ci.yml that runs tests on push.' })]
export const sampleJob = (): JobPosting => ({ id: 'j1', title: 'Back-End Developer Intern', company: 'Not detected', sourceUrl: 'https://example.com/careers/backend-intern', sample: true,
  requirements: [['API development', 1], ['Python', 1], ['React', 1], ['SQL', 1], ['Automated testing', 1], ['Docker', 0], ['CI/CD', 0], ['Git', 0]].map(([name, r]) => ({ name: name as string, required: !!r })) })
export const commitFiles: RepositoryFile[] = [
  { path: 'db/queries.sql', kind: 'sql', excerpt: 'SELECT item, COUNT(*) FROM orders GROUP BY item;', explanation: 'Aggregation query used by the analytics endpoint.' },
  { path: 'tests/test_api.py', kind: 'test', excerpt: 'def test_create_order(client):\n    assert client.post("/orders", json=P).status_code == 201', explanation: 'Pytest test hitting the orders endpoint.' }]
export const newCommit = (): Commit => ({ sha: 'e58b2a4', message: 'Add SQL queries and automated tests', date: iso(0), files: ['db/queries.sql', 'tests/test_api.py'] })
export const reassessed = (s: SkillAssessment[]): SkillAssessment[] => s.map(x => x.name === 'SQL' ? { ...x, previous: x.status, status: 'demonstrated', confidence: 0.78, updatedAt: iso(0), gap: undefined, evidence: [ev('db/queries.sql', commitFiles[0].excerpt, commitFiles[0].explanation, 'e58b2a4')] }
  : x.name === 'Automated testing' ? { ...x, previous: x.status, status: 'partial', confidence: 0.55, updatedAt: iso(0), gap: 'One test file covers a single endpoint; coverage is limited.', improvement: 'Add tests for update and delete routes.', evidence: [ev('tests/test_api.py', commitFiles[1].excerpt, commitFiles[1].explanation, 'e58b2a4')] } : x)
export const seedTasks = (): RoadmapTask[] => [
  { id: 't1', plan: '7-day', title: 'Write SQL queries for order analytics', artifact: 'db/queries.sql', skill: 'SQL', done: false },
  { id: 't2', plan: '7-day', title: 'Add pytest tests for orders endpoints', artifact: 'tests/test_api.py', skill: 'Automated testing', done: false },
  { id: 't3', plan: '30-day', title: 'Add GitHub Actions workflow running tests', artifact: '.github/workflows/ci.yml', skill: 'CI/CD', done: false },
  { id: 't4', plan: '30-day', title: 'Add docker-compose with database service', artifact: 'docker-compose.yml', skill: 'Docker', done: false }]
const KNOWN = ['API development', 'Python', 'React', 'SQL', 'Automated testing', 'Docker', 'CI/CD', 'Git', 'Node.js', 'TypeScript', 'MongoDB', 'Java', 'AWS', 'Kubernetes', 'REST', 'JavaScript']
const ALIASES: Record<string, string[]> = { 'API development': ['api', 'rest'], 'Automated testing': ['testing', 'unit test', 'pytest', 'jest'], 'CI/CD': ['ci/cd', 'github actions'], 'Node.js': ['node'] }
export const extractRequirements = (text: string) => {
  let preferred = false; const out = new Map<string, boolean>()
  for (const line of text.split('\n')) {
    if (/preferred|nice to have|bonus/i.test(line)) preferred = true
    if (/required|must have|requirements/i.test(line)) preferred = false
    const l = line.toLowerCase()
    for (const k of KNOWN) if ([k.toLowerCase(), ...(ALIASES[k] || [])].some(a => l.includes(a)) && !out.has(k)) out.set(k, !preferred)
  }
  return [...out].map(([name, required]) => ({ name, required }))
}
