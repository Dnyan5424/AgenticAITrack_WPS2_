import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { GitBranch, FileCode2, Database, TestTube2, Container, FileText, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Fresh, PageHead, NeedConnect, Empty, Meta, Code, Modal, fmt } from '../components/ui'
import { USE_MOCK } from '../api/client'
import { authService } from '../services/authService'
import { repositoryService } from '../services/repositoryService'
import { jobService } from '../services/jobService'
import type { RepositoryFile } from '../types'
import type { JobRoleRecommendation } from '../types'
export function Dashboard() {
  const { user, repo, repositories, job, skills, fit, freshness, lastAssessed, changes, push } = useApp()
  const [roles, setRoles] = useState<JobRoleRecommendation[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  useEffect(() => {
    if (!user) return
    let active = true
    setRolesLoading(true)
    jobService.recommendations()
      .then(result => { if (active) setRoles(result) })
      .catch(error => { if (active) push(`Role recommendations could not be loaded: ${(error as Error).message}`, 'err') })
      .finally(() => { if (active) setRolesLoading(false) })
    return () => { active = false }
  }, [user?.id, repositories.length, skills, push])
  if (!user || !repo) return <><PageHead title="Dashboard" /><NeedConnect /></>
  const demo = skills.filter(s => s.status === 'demonstrated'); const crit = job ? job.requirements.filter(r => r.required && ['not_demonstrated', 'under_review'].includes(skills.find(s => s.name === r.name)?.status || 'not_demonstrated')) : []
  const trend = [{ d: 'Start', v: 40 }, { d: 'Now', v: fit.score }]
  const next = !job ? ['Add a job to compare against', '/job-analyzer'] : crit.length ? [`Add evidence for ${crit[0].name}`, '/gaps'] : ['All required skills have evidence. Review the report.', '/job-analyzer#job-fit-report']
  return <><PageHead title="Dashboard" sub="One shared view of repository evidence, your selected job and assessment freshness."><Fresh f={freshness} /></PageHead>
    <div className="grid gap-5 md:grid-cols-3">
      <div className="card p-5 sm:p-6"><div className="text-xs font-medium text-ink2">Job-fit score (heuristic)</div><div className="mt-1 font-head text-4xl font-bold tabular-nums text-teal">{job ? fit.score + '%' : '—'}</div><div className="mt-1 text-xs leading-5 text-ink2">{job ? `${fit.got} of ${fit.max} points · ${job.title}` : 'No job selected'}</div>
        <div className="mt-2 h-20"><ResponsiveContainer><AreaChart data={trend}><XAxis dataKey="d" hide /><Tooltip /><Area dataKey="v" stroke="#0F766E" fill="#E5F4F1" /></AreaChart></ResponsiveContainer></div></div>
      <div className="card space-y-4 p-5 sm:p-6"><Meta k="Account" v={user.demo ? user.name : user.githubLogin} /><Meta k="Repository" v={repo.name} /><Meta k="Latest analysed commit" v={<span className="font-mono">{repo.analyzedSha}</span>} /><Meta k="Last successful assessment" v={fmt(lastAssessed)} /></div>
      <div className="card p-5 sm:p-6"><div className="text-xs font-medium text-ink2">Recommended next action</div><p className="mt-2 font-medium leading-6">{next[0]}</p><Link to={next[1]} className="btn-p mt-4">Go</Link></div></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="card p-5 sm:p-6"><h2 className="font-display font-semibold tracking-tight">Demonstrated skills ({demo.length})</h2><div className="mt-4 flex flex-wrap gap-2">{demo.map(s => <span key={s.name} className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-ok">{s.name}</span>)}</div></div>
      <div className="card p-5 sm:p-6"><h2 className="font-display font-semibold tracking-tight">Critical evidence gaps ({crit.length})</h2>{!job ? <p className="mt-3 text-sm leading-6 text-ink2">Select a job to see gaps.</p> : <ul className="mt-4 space-y-2 text-sm">{crit.map(c => <li key={c.name}>{c.name} <span className="text-ink2">· not demonstrated in this scope</span></li>)}{!crit.length && <li className="text-ink2">None.</li>}</ul>}</div></div>
    <section className="card mt-5 p-5 sm:p-6" aria-labelledby="role-recommendations">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="role-recommendations" className="font-semibold">Five roles that match your repository evidence</h2><p className="mt-1 text-sm text-ink2">Based on assessed skills across {repositories.length || 1} connected {repositories.length === 1 ? 'repository' : 'repositories'}. These are role suggestions, not live vacancies.</p></div><Link className="text-sm text-teal underline" to="/onboarding">Manage repositories</Link></div>
      {rolesLoading && <p className="mt-4 text-sm text-ink2">Matching verified repository skills to job roles…</p>}
      {!rolesLoading && !roles.length && <p className="mt-4 text-sm text-ink2">Analyze at least one public repository to see role matches.</p>}
      <ol className="mt-4 divide-y divide-line">{roles.map((role, index) => <li key={role.title} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
        <span className="w-6 text-sm tabular-nums text-mute">{index + 1}.</span><span className="min-w-40 flex-1 font-medium">{role.title}</span><span className="text-sm font-semibold text-teal">{role.match}% evidence match</span>
        <span className="w-full pl-10 text-xs text-ink2">{role.matchedSkills.length ? `Evidence: ${role.matchedSkills.join(', ')}` : 'No matching skills demonstrated yet in the assessed scope.'}{role.missingSkills.length ? ` · To strengthen: ${role.missingSkills.slice(0, 5).join(', ')}` : ''}</span>
      </li>)}</ol>
      <p className="mt-3 text-xs text-mute">Role suggestions are estimates based on repository evidence, not hiring predictions or live vacancies.</p>
    </section>
    <div className="card mt-4 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent changes and commits</h2><Link className="text-sm text-teal underline" to="/changes">Change activity</Link></div>{changes.length ? changes.slice(0, 3).map(c => <div key={c.id} className="mt-2 flex justify-between gap-3 text-sm"><span>{c.message} <span className="font-mono text-xs text-ink2">{c.sha.slice(0, 7)}</span></span><span className="shrink-0 text-ink2">{c.state}</span></div>) : repo.commits.slice(0, 5).map(c => <div key={c.sha} className="mt-2 flex justify-between gap-3 text-sm"><a className="min-w-0 truncate text-teal hover:underline" href={c.url} target="_blank" rel="noreferrer">{c.message}</a><span className="shrink-0 font-mono text-xs text-ink2">{c.sha.slice(0, 7)}</span></div>)}{!changes.length && !repo.commits.length && <p className="mt-2 text-sm text-ink2">No commits loaded yet. Refresh the page after connecting a public repository.</p>}</div></>
}
export function CareerDNA() {
  const { skills, user } = useApp(); const { q } = useOutletContext<{ q: string }>(); const [cat, setCat] = useState('All'); const [local, setLocal] = useState('')
  if (!user) return <><PageHead title="Career DNA" /><NeedConnect /></>
  const cats = ['All', ...new Set(skills.map(s => s.category))]; const term = (local || q).toLowerCase()
  const list = skills.filter(s => (cat === 'All' || s.category === cat) && s.name.toLowerCase().includes(term))
  return <><PageHead title="Career DNA" sub="Skills shown with the evidence found. Missing evidence does not prove a student lacks a skill." />
    <div className="mb-4 flex flex-wrap gap-2"><input aria-label="Filter skills" className="input max-w-xs" placeholder="Filter skills" value={local} onChange={e => setLocal(e.target.value)} />{cats.map(c => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`btn ${cat === c ? 'bg-teal text-white' : 'bg-white border border-line'}`}>{c}</button>)}</div>
    <div className="grid gap-3 md:grid-cols-2">{list.map(s => <div key={s.name} className="card p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{s.name}</h3><Badge s={s.status} /></div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs"><Meta k="Evidence" v={s.evidence.length} /><Meta k="Confidence" v={Math.round(s.confidence * 100) + '%'} /><Meta k="Updated" v={fmt(s.updatedAt)} /></div>
      {s.evidence.map(e => <div key={e.file} className="mt-2 text-xs text-ink2"><span className="font-mono">{e.repo}/{e.file}</span> · <span className="font-mono">{e.commit}</span></div>)}{!s.evidence.length && <p className="mt-2 text-xs text-ink2">No evidence found in the analyzed scope.</p>}</div>)}</div>
    {!list.length && <Empty title="No matching skills" text="Try a different filter or search term." />}</>
}
export function Repositories() {
  const { user, repo, connectDemo, disconnect, analyzeRepo, busy, push } = useApp(); const [q, setQ] = useState(''); const [m, setM] = useState(false)
  return <><PageHead title="Repositories" sub="Connect GitHub and choose which repositories SkillProof may analyse.">{!user && <button className="btn-p" onClick={() => USE_MOCK ? connectDemo() : authService.loginWithGithub()} disabled={busy}><GitBranch size={16} />{USE_MOCK ? 'Continue' : 'Connect with GitHub'}</button>}{user && <button className="btn-s" onClick={() => setM(true)}>Disconnect</button>}</PageHead>
    {!user || !repo ? <Empty title="GitHub is not connected" text="You will be redirected to GitHub to authorise read access. Tokens are never pasted here." /> : <>
      <input aria-label="Search repositories" className="input mb-4 max-w-sm" placeholder="Search repositories" value={q} onChange={e => setQ(e.target.value)} />
      {repo.name.includes(q.toLowerCase()) && <div className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-mono font-semibold">{repo.name}</h3><p className="mt-1 text-sm text-ink2">{repo.description}</p></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5"><Meta k="Language" v={repo.language} /><Meta k="Default branch" v={repo.branch} /><Meta k="Latest SHA" v={<span className="font-mono">{repo.latestSha}</span>} /><Meta k="Analysed SHA" v={<span className="font-mono">{repo.analyzedSha}</span>} /><Meta k="Analysed at" v={fmt(repo.analyzedAt)} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><button className="btn-p" onClick={analyzeRepo} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{busy ? 'Analysing…' : 'Analyse now'}</button>{busy && <span className="text-xs text-ink2">Large repositories may take a few minutes.</span>}<Link className="btn-s" to={`/repositories/${repo.id}`}>View evidence</Link></div></div>}</>}
    <Modal open={m} title="Disconnect GitHub?" text="This removes connected repositories and their assessments. Your SkillProof account remains signed in." confirm="Disconnect" onClose={() => setM(false)} onOk={() => void disconnect().catch(error => push((error as Error).message, 'err'))} /></>
}
const KI = { source: FileCode2, sql: Database, test: TestTube2, deploy: Container, doc: FileText }
export function RepoDetails() {
  const { id } = useParams(); const { repo, setRepo, skills } = useApp(); const [sel, setSel] = useState<RepositoryFile | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const loadedRepo = useRef<string | null>(null)
  useEffect(() => {
    if (!id || !repo || repo.id !== id || repo.files.length || loadedRepo.current === id) return
    let active = true
    setLoading(true); setError('')
    repositoryService.get(id).then(details => {
      if (active) { loadedRepo.current = id; void setRepo(details) }
    }).catch(reason => { if (active) setError((reason as Error).message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, repo?.id, repo?.files.length, setRepo])
  if (!repo || repo.id !== id) return <><PageHead title="Repository details" /><Empty title="Repository not found" text="Connect an account and open a repository from the list." action={<Link className="btn-p" to="/repositories">Back to repositories</Link>} /></>
  return <><PageHead title={repo.name} sub={repo.description} />{loading && <p className="mb-3 text-sm text-ink2">Loading repository files and commit history…</p>}{error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="card p-4"><h2 className="mb-2 font-semibold">Analyzed files ({repo.files.length})</h2>{!repo.files.length && !loading && <p className="text-sm text-ink2">No analyzed file snapshot is available. Run analysis from Repositories after adding a job description.</p>}<ul>{repo.files.map(f => { const I = KI[f.kind]; return <li key={f.path}><button onClick={() => setSel(f)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs hover:bg-soft ${sel?.path === f.path ? 'bg-teal-light' : ''}`}><I size={14} />{f.path}<span className="ml-auto font-sans text-mute">{f.kind}</span></button></li> })}</ul>
        <h2 className="mb-2 mt-4 font-semibold">Recent commit history</h2>{repo.commits.map(c => <div key={c.sha} className="border-t border-line py-2 text-sm"><a className="font-mono text-xs text-teal hover:underline" href={c.url} target="_blank" rel="noreferrer">{c.sha.slice(0, 7)}</a> <a className="hover:underline" href={c.url} target="_blank" rel="noreferrer">{c.message}</a><div className="text-xs text-mute">{fmt(c.date)}</div></div>)}</div>
      <div className="card p-4">{sel ? <><h2 className="font-mono text-sm font-semibold">{sel.path}</h2><div className="mt-3"><Code>{sel.excerpt}</Code></div><p className="mt-3 text-sm text-ink2">{sel.explanation}</p><p className="mt-2 text-xs text-mute">{sel.url ? <a className="text-teal underline" href={sel.url} target="_blank" rel="noreferrer">Open source file on GitHub</a> : 'Source link unavailable.'}</p>
        <div className="mt-3 flex flex-wrap gap-1">{skills.filter(s => s.evidence.some(e => e.file === sel.path)).map(s => <Badge key={s.name} s={s.status} />)}</div></> : <p className="text-sm text-ink2">Select a file to see its code evidence, explanation and related skills.</p>}</div></div></>
}
export function Settings() {
  const { user, repo, disconnect, signOut, deleteAccount, push } = useApp()
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const [n, setN] = useState({ commit: true, gap: true, email: false })
  const tog = (k: keyof typeof n, label: string) => <label className="flex items-center justify-between py-2 text-sm">{label}<input type="checkbox" className="h-4 w-4 accent-teal" checked={n[k]} onChange={e => setN(current => ({ ...current, [k]: e.target.checked }))} /></label>
  const unlinkGitHub = async () => {
    setWorking(true)
    try { await disconnect() } catch (error) { push((error as Error).message, 'err') } finally { setWorking(false) }
  }
  const removeAccount = async () => {
    setWorking(true)
    try { await deleteAccount() } catch (error) { push((error as Error).message, 'err') } finally { setWorking(false) }
  }
  return <><PageHead title="Settings" />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5"><h2 className="font-semibold">Account</h2><div className="mt-3 space-y-2"><Meta k="Name" v={user?.name || 'Not signed in'} /><Meta k="Email" v={user?.email || '—'} /></div><div className="mt-4 flex flex-wrap gap-3"><button className="btn-s" disabled={!user || working} onClick={() => { setWorking(true); void signOut().catch(error => push((error as Error).message, 'err')).finally(() => setWorking(false)) }}>Sign out</button></div></div>
      <div className="card p-5"><h2 className="font-semibold">GitHub connection</h2><div className="mt-3 space-y-2"><Meta k="Status" v={user?.demo ? 'Account ready' : user?.githubLogin ? `Connected as ${user.githubLogin}` : 'Not connected'} /><Meta k="Repository" v={repo?.name || 'None selected'} /><Meta k="Access" v="Read access is used only for public repositories you choose." /></div>{user?.githubLogin && !user.demo && <button className="btn mt-4 border border-err text-err" disabled={working} onClick={() => setDisconnectOpen(true)}>Disconnect GitHub</button>}{user && !user.githubLogin && <button className="btn-s mt-4" onClick={() => authService.loginWithGithub()}>Connect GitHub</button>}</div>
      <div className="card p-5"><h2 className="font-semibold">Notifications</h2>{tog('commit', 'Notify when a commit changes an assessment')}{tog('gap', 'Notify when a gap is resolved')}{tog('email', 'Email digest')}<button className="btn-s mt-2" onClick={() => push('Preferences saved locally.', 'ok')}>Save preferences</button></div>
      <div className="card p-5"><h2 className="font-semibold">Delete account</h2><p className="mt-2 text-sm text-ink2">This permanently deletes your profile, connected repositories, jobs and assessment data. This cannot be undone.</p><label htmlFor="delete-account-confirm" className="mt-4 block text-sm">Type <strong>DELETE</strong> to confirm</label><input id="delete-account-confirm" className="input mt-1 w-full" value={deleteConfirm} onChange={event => setDeleteConfirm(event.target.value)} /><button className="btn mt-3 border border-err bg-err text-white" disabled={!user || USE_MOCK || working || deleteConfirm !== 'DELETE'} onClick={() => void removeAccount()}>{working ? 'Working…' : 'Permanently delete account'}</button>{USE_MOCK && <p className="mt-2 text-xs text-mute">Account deletion is unavailable.</p>}</div>
    </div>
    <Modal open={disconnectOpen} title="Disconnect GitHub?" text="This removes your connected repository, evidence and assessments. Your SkillProof account and jobs remain." confirm="Disconnect GitHub" onClose={() => setDisconnectOpen(false)} onOk={() => void unlinkGitHub()} />
  </>
}
