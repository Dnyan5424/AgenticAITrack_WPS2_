import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { GitBranch, FileCode2, Database, TestTube2, Container, FileText, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Fresh, PageHead, NeedConnect, Empty, Meta, Code, Modal, DemoTag, fmt } from '../components/ui'
import { USE_MOCK } from '../api/client'
import { authService } from '../services/authService'
import type { RepositoryFile } from '../types'
export function Dashboard() {
  const { user, repo, job, skills, fit, freshness, lastAssessed, changes } = useApp()
  if (!user || !repo) return <><PageHead title="Dashboard" /><NeedConnect /></>
  const demo = skills.filter(s => s.status === 'demonstrated'); const crit = job ? job.requirements.filter(r => r.required && ['not_demonstrated', 'under_review'].includes(skills.find(s => s.name === r.name)?.status || 'not_demonstrated')) : []
  const trend = [{ d: 'Start', v: 40 }, { d: 'Now', v: fit.score }]
  const next = !job ? ['Add a job to compare against', '/job-analyzer'] : crit.length ? [`Add evidence for ${crit[0].name}`, '/gaps'] : ['All required skills have evidence. Review the report.', '/job-fit']
  return <><PageHead title="Dashboard" sub="One shared view of repository evidence, your selected job and assessment freshness."><Fresh f={freshness} />{USE_MOCK && <DemoTag />}</PageHead>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card p-5"><div className="text-xs text-mute">Job-fit score (heuristic)</div><div className="font-head text-4xl font-bold text-teal">{job ? fit.score + '%' : '—'}</div><div className="text-xs text-ink2">{job ? `${fit.got} of ${fit.max} points · ${job.title}` : 'No job selected'}</div>
        <div className="mt-2 h-20"><ResponsiveContainer><AreaChart data={trend}><XAxis dataKey="d" hide /><Tooltip /><Area dataKey="v" stroke="#0F766E" fill="#E5F4F1" /></AreaChart></ResponsiveContainer></div></div>
      <div className="card space-y-3 p-5"><Meta k="GitHub account" v={user.githubLogin} /><Meta k="Repositories" v="1 connected" /><Meta k="Latest analysed commit" v={<span className="font-mono">{repo.analyzedSha}</span>} /><Meta k="Last successful assessment" v={fmt(lastAssessed)} /></div>
      <div className="card p-5"><div className="text-xs text-mute">Recommended next action</div><p className="mt-1 font-medium">{next[0]}</p><Link to={next[1]} className="btn-p mt-3">Go</Link></div></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="card p-5"><h2 className="font-semibold">Demonstrated skills ({demo.length})</h2><div className="mt-3 flex flex-wrap gap-2">{demo.map(s => <span key={s.name} className="rounded-full bg-green-50 px-3 py-1 text-xs text-ok">{s.name}</span>)}</div></div>
      <div className="card p-5"><h2 className="font-semibold">Critical evidence gaps ({crit.length})</h2>{!job ? <p className="mt-2 text-sm text-ink2">Select a job to see gaps.</p> : <ul className="mt-3 space-y-1 text-sm">{crit.map(c => <li key={c.name}>{c.name} <span className="text-ink2">· not demonstrated in this scope</span></li>)}{!crit.length && <li className="text-ink2">None.</li>}</ul>}</div></div>
    <div className="card mt-4 p-5"><h2 className="font-semibold">Recent changes</h2>{changes.length ? changes.slice(0, 3).map(c => <div key={c.id} className="mt-2 flex justify-between text-sm"><span>{c.message} <span className="font-mono text-xs text-ink2">{c.sha}</span></span><span className="text-ink2">{c.state}</span></div>) : repo.commits.slice(0, 3).map(c => <div key={c.sha} className="mt-2 flex justify-between text-sm"><span>{c.message}</span><span className="font-mono text-xs text-ink2">{c.sha}</span></div>)}</div></>
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
  const { user, repo, connectDemo, disconnect, analyzeRepo, busy } = useApp(); const [q, setQ] = useState(''); const [m, setM] = useState(false)
  return <><PageHead title="Repositories" sub="Connect GitHub and choose which repositories SkillProof may analyse.">{!user && <button className="btn-p" onClick={() => USE_MOCK ? connectDemo() : authService.loginWithGithub()} disabled={busy}><GitBranch size={16} />{USE_MOCK ? 'Connect demo account' : 'Connect with GitHub'}</button>}{user && <button className="btn-s" onClick={() => setM(true)}>Disconnect</button>}</PageHead>
    {!user || !repo ? <Empty title="GitHub is not connected" text={USE_MOCK ? 'Demo mode uses a simulated account and sample repository.' : 'You will be redirected to GitHub to authorise read access. Tokens are never pasted here.'} /> : <>
      <input aria-label="Search repositories" className="input mb-4 max-w-sm" placeholder="Search repositories" value={q} onChange={e => setQ(e.target.value)} />
      {repo.name.includes(q.toLowerCase()) && <div className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-mono font-semibold">{repo.name}</h3><p className="mt-1 text-sm text-ink2">{repo.description}</p></div>{USE_MOCK && <DemoTag />}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5"><Meta k="Language" v={repo.language} /><Meta k="Default branch" v={repo.branch} /><Meta k="Latest SHA" v={<span className="font-mono">{repo.latestSha}</span>} /><Meta k="Analysed SHA" v={<span className="font-mono">{repo.analyzedSha}</span>} /><Meta k="Analysed at" v={fmt(repo.analyzedAt)} /></div>
        <div className="mt-4 flex gap-2"><button className="btn-p" onClick={analyzeRepo} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{busy ? 'Analysing…' : 'Analyse now'}</button><Link className="btn-s" to={`/repositories/${repo.id}`}>View evidence</Link></div></div>}</>}
    <Modal open={m} title="Disconnect GitHub?" text="Repositories and assessments will be cleared from this session." confirm="Disconnect" onClose={() => setM(false)} onOk={disconnect} /></>
}
const KI = { source: FileCode2, sql: Database, test: TestTube2, deploy: Container, doc: FileText }
export function RepoDetails() {
  const { id } = useParams(); const { repo, skills } = useApp(); const [sel, setSel] = useState<RepositoryFile | null>(null)
  if (!repo || repo.id !== id) return <><PageHead title="Repository details" /><Empty title="Repository not found" text="Connect an account and open a repository from the list." action={<Link className="btn-p" to="/repositories">Back to repositories</Link>} /></>
  return <><PageHead title={repo.name} sub={repo.description} />
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="card p-4"><h2 className="mb-2 font-semibold">File tree</h2><ul>{repo.files.map(f => { const I = KI[f.kind]; return <li key={f.path}><button onClick={() => setSel(f)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs hover:bg-soft ${sel?.path === f.path ? 'bg-teal-light' : ''}`}><I size={14} />{f.path}<span className="ml-auto font-sans text-mute">{f.kind}</span></button></li> })}</ul>
        <h2 className="mb-2 mt-4 font-semibold">Commit history</h2>{repo.commits.map(c => <div key={c.sha} className="border-t border-line py-2 text-sm"><span className="font-mono text-xs text-teal">{c.sha}</span> {c.message}</div>)}</div>
      <div className="card p-4">{sel ? <><h2 className="font-mono text-sm font-semibold">{sel.path}</h2><div className="mt-3"><Code>{sel.excerpt}</Code></div><p className="mt-3 text-sm text-ink2">{sel.explanation}</p><p className="mt-2 text-xs text-mute">Source link unavailable: this is illustrative sample data.</p>
        <div className="mt-3 flex flex-wrap gap-1">{skills.filter(s => s.evidence.some(e => e.file === sel.path)).map(s => <Badge key={s.name} s={s.status} />)}</div></> : <p className="text-sm text-ink2">Select a file to see its code evidence, explanation and related skills.</p>}</div></div></>
}
export function Settings() {
  const { user, repo, disconnect, push } = useApp(); const [m, setM] = useState(false); const [n, setN] = useState({ commit: true, gap: true, email: false })
  const tog = (k: keyof typeof n, l: string) => <label className="flex items-center justify-between py-2 text-sm">{l}<input type="checkbox" className="h-4 w-4 accent-teal" checked={n[k]} onChange={e => setN({ ...n, [k]: e.target.checked })} /></label>
  return <><PageHead title="Settings" />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5"><h2 className="font-semibold">Profile</h2><div className="mt-3 space-y-2"><Meta k="Name" v={user?.name || 'Not signed in'} /><Meta k="Email" v={user?.email || '—'} /></div></div>
      <div className="card p-5"><h2 className="font-semibold">GitHub connection</h2><div className="mt-3 space-y-2"><Meta k="Status" v={user ? 'Connected (simulated)' : 'Not connected'} /><Meta k="Repositories" v={repo?.name || 'None'} /><Meta k="Change detection" v={user ? 'Simulated in demo mode; real webhooks live in the backend' : 'Off'} /><Meta k="Last synchronisation" v={fmt(repo?.analyzedAt)} /></div></div>
      <div className="card p-5"><h2 className="font-semibold">Notifications</h2>{tog('commit', 'Notify when a commit changes an assessment')}{tog('gap', 'Notify when a gap is resolved')}{tog('email', 'Email digest')}<button className="btn-s mt-2" onClick={() => push('Preferences saved locally (mock).', 'ok')}>Save preferences</button></div>
      <div className="card p-5"><h2 className="font-semibold">Privacy</h2><p className="mt-2 text-sm text-ink2">SkillProof reads repository contents you connect. It never asks for tokens. Disconnecting removes assessments from this session.</p><button className="btn mt-3 border border-err text-err" disabled={!user} onClick={() => setM(true)}>Disconnect GitHub</button></div></div>
    <Modal open={m} title="Disconnect GitHub?" text="This clears repositories, assessments and change history." confirm="Disconnect" onClose={() => setM(false)} onOk={disconnect} /></>
}
