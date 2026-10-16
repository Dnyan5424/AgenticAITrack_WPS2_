import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GitCommit, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Fresh, PageHead, NeedConnect, Empty, DemoTag, fmt } from '../components/ui'
import { USE_MOCK } from '../api/client'
import { resumeService } from '../services/resumeService'
import type { ResumeClaim } from '../types'
export function Changes() {
  const { user, repo, changes, simulateCommit, freshness, skills } = useApp()
  if (!user || !repo) return <><PageHead title="Change Activity" /><NeedConnect /></>
  return <><PageHead title="Change Activity" sub="New commits trigger reassessment of affected skills only. Unaffected skills stay unchanged.">
    <Fresh f={freshness} />{USE_MOCK ? <button className="btn-p" onClick={simulateCommit} disabled={freshness === 'in_progress'}><GitCommit size={16} />Simulate new commit</button> : null}</PageHead>
    {USE_MOCK && <p className="mb-4"><DemoTag>Demo mode: commits and reassessment below are simulated</DemoTag></p>}
    {!changes.length ? <Empty title="No change events yet" text="Push a commit to a connected repository, or use Simulate new commit in demo mode." /> : <div className="space-y-4">{changes.map(c => <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{c.message}</h3><p className="font-mono text-xs text-ink2">{c.repo} · {c.sha}{c.simulated && ' · simulated'}</p></div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.state === 'complete' ? 'border-green-200 bg-green-50 text-ok' : 'border-blue-200 bg-blue-50 text-review'}`}>{c.state === 'complete' ? 'Reassessment complete' : 'Reassessing affected skills'}</span></div>
      <div className="mt-3 font-mono text-xs">{c.files.map(f => <div key={f}>+ {f}</div>)}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{c.affected.map(a => <div key={a} className="rounded-xl border border-line bg-inset p-3 text-sm"><div className="font-medium">{a}</div><div className="mt-1 flex flex-wrap items-center gap-2"><Badge s={c.before[a]} /><ArrowRight size={14} />{c.after ? <Badge s={c.after[a]} /> : <Badge s="under_review" />}</div></div>)}</div>
      <p className="mt-3 text-xs text-ink2">Unchanged skills: {skills.filter(s => !c.affected.includes(s.name)).map(s => s.name).join(', ')}</p>
      <p className="mt-1 text-xs text-mute">Detected {fmt(c.detectedAt)} · Completed {fmt(c.completedAt)} · Commit URL unavailable for sample data</p></motion.div>)}</div>}</>
}
export function Roadmap() {
  const { user, tasks, toggleTask, analyzeRepo, push } = useApp()
  if (!user) return <><PageHead title="Learning Roadmap" /><NeedConnect /></>
  const pct = tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0
  return <><PageHead title="Learning Roadmap" sub="Recommendations only. Ticking a task does not change any assessment; new evidence does."><button className="btn-p" onClick={() => { analyzeRepo(); push('Repository re-analysed. Gaps change only if new evidence was found.') }}>Reassess repository</button></PageHead>
    <div className="card mb-4 p-4"><div className="mb-1 flex justify-between text-sm"><span>Planned progress (self-reported)</span><span>{pct}%</span></div><div className="h-2 rounded-full bg-soft"><div className="h-2 rounded-full bg-teal transition-all" style={{ width: pct + '%' }} /></div></div>
    {(['7-day', '30-day'] as const).map(p => <section key={p} className="mb-5"><h2 className="mb-2 font-semibold">{p} plan</h2><div className="space-y-2">{tasks.filter(t => t.plan === p).map(t => <label key={t.id} className="card flex cursor-pointer items-start gap-3 p-4"><input type="checkbox" className="mt-1 h-4 w-4 accent-teal" checked={t.done} onChange={() => toggleTask(t.id)} /><div><div className={t.done ? 'text-ink2 line-through' : 'font-medium'}>{t.title}</div><div className="text-xs text-ink2">Expected artifact: <span className="font-mono">{t.artifact}</span> · Skill: {t.skill}</div></div></label>)}</div></section>)}</>
}
export function Resume() {
  const { skills, user } = useApp(); const [text, setText] = useState(''); const [res, setRes] = useState<ResumeClaim[] | null>(null); const [load, setLoad] = useState(false)
  if (!user) return <><PageHead title="Resume Reality Check" /><NeedConnect /></>
  const V = { supported: ['Supported by evidence', 'text-ok bg-green-50 border-green-200'], partial: ['Partially supported', 'text-part bg-amber-light border-amber-200'], not_in_scope: ['Not demonstrated in analysed scope', 'text-none bg-slate-100 border-slate-200'] }
  return <><PageHead title="Resume Reality Check" sub="Paste resume text. Unsupported claims are not treated as false." />
    <div className="grid gap-4 lg:grid-cols-2"><div className="card space-y-3 p-5"><label htmlFor="rt" className="text-sm font-medium">Resume text</label><textarea id="rt" rows={10} className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Built REST APIs in Python. Experience with SQL, React and automated testing." />
      <button className="btn-p" disabled={!text.trim() || load} onClick={async () => { setLoad(true); setRes(await resumeService.analyze(text, skills)); setLoad(false) }}>{load ? 'Checking…' : 'Check claims'}</button><p className="text-xs text-mute">File upload will be enabled with POST /resume/analyze on the backend.</p></div>
      <div className="space-y-3">{!res ? <Empty title="No results yet" text="Extracted claims and their evidence appear here." /> : !res.length ? <Empty title="No known technical claims found" text="Mention skills such as Python, SQL or React." /> : res.map(c => <div key={c.claim} className="card p-4"><div className="flex items-center gap-2"><h3 className="font-semibold">{c.claim}</h3><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${V[c.verdict][1]}`}>{V[c.verdict][0]}</span></div><p className="mt-1 text-sm text-ink2">{c.note}</p>{c.verdict !== 'supported' && <p className="mt-1 text-sm">To strengthen: commit a file that demonstrates it, then <Link className="text-teal underline" to="/changes">reassess</Link>.</p>}</div>)}</div></div></>
}
