import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { jobService } from '../services/jobService'
import { Badge, PageHead, NeedConnect, Empty, Meta, Code, DemoTag, fmt } from '../components/ui'
import type { JobPosting } from '../types'
import { POINTS } from '../utils'
export function JobAnalyzer() {
  const { user, job, setJob, push } = useApp(); const [url, setUrl] = useState(''); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [load, setLoad] = useState(false); const [draft, setDraft] = useState<JobPosting | null>(job); const [tag, setTag] = useState('')
  if (!user) return <><PageHead title="Job Analyzer" /><NeedConnect /></>
  const run = async () => {
    if (!text.trim() && !url.trim()) return setErr('Paste a job description, or add a URL together with the pasted text.')
    if (url && !/^https?:\/\//.test(url)) return setErr('The URL must start with http:// or https://.')
    if (url && !text.trim()) return setErr('Live URL retrieval needs the backend. Paste the job description text instead.')
    setErr(''); setLoad(true)
    try { const j = await jobService.analyze({ url, text }); if (!j.requirements.length) setErr('No known skills were found. Add skill tags manually below.'); setDraft(j) } catch (e) { setErr((e as Error).message) } finally { setLoad(false) }
  }
  const edit = (f: (j: JobPosting) => JobPosting) => draft && setDraft(f(draft))
  return <><PageHead title="Job Analyzer" sub="Paste a real job or internship description. Edit the extracted skills before assessing." />
    <div className="grid gap-4 lg:grid-cols-2"><div className="card space-y-3 p-5">
      <div><label htmlFor="u" className="mb-1 block text-sm font-medium">Source URL (optional)</label><input id="u" className="input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} /></div>
      <div><label htmlFor="t" className="mb-1 block text-sm font-medium">Job description</label><textarea id="t" rows={9} className="input" value={text} onChange={e => setText(e.target.value)} placeholder={'Required: Python, REST APIs, SQL\nPreferred: Docker, CI/CD'} /></div>
      {err && <p role="alert" className="text-sm text-err">{err}</p>}
      <div className="flex flex-wrap gap-2"><button className="btn-p" onClick={run} disabled={load}>{load ? 'Extracting…' : 'Extract requirements'}</button><button className="btn-s" onClick={() => { setDraft(jobService.sample()); setUrl('') }}>Load sample job</button></div>
      <p className="text-xs text-mute">Extraction runs in the browser in mock mode. No live page retrieval is performed.</p></div>
      <div className="card p-5">{!draft ? <p className="text-sm text-ink2">Extracted job details appear here.</p> : <>
        <div className="flex items-start justify-between"><div><h2 className="font-semibold">{draft.title}</h2><p className="text-sm text-ink2">{draft.company}</p></div>{draft.sample && <DemoTag>Sample data</DemoTag>}</div>
        <p className="mt-1 break-all font-mono text-xs text-ink2">{draft.sourceUrl || 'No source URL provided'}</p>
        {(['Required', 'Preferred'] as const).map(g => <div key={g} className="mt-4"><div className="mb-1 text-xs text-mute">{g} skills</div><div className="flex flex-wrap gap-2">{draft.requirements.filter(r => r.required === (g === 'Required')).map(r => <span key={r.name} className="inline-flex items-center gap-1 rounded-full bg-teal-light px-3 py-1 text-xs text-teal">{r.name}<button aria-label={`Remove ${r.name}`} onClick={() => edit(j => ({ ...j, requirements: j.requirements.filter(x => x.name !== r.name) }))}><X size={12} /></button></span>)}</div></div>)}
        <div className="mt-4 flex gap-2"><input aria-label="Add skill" className="input" placeholder="Add skill" value={tag} onChange={e => setTag(e.target.value)} />
          <button className="btn-s" onClick={() => { if (tag.trim()) { edit(j => ({ ...j, requirements: [...j.requirements, { name: tag.trim(), required: true }] })); setTag('') } }}><Plus size={14} />Required</button>
          <button className="btn-s" onClick={() => { if (tag.trim()) { edit(j => ({ ...j, requirements: [...j.requirements, { name: tag.trim(), required: false }] })); setTag('') } }}>Preferred</button></div>
        <button className="btn-p mt-4" disabled={!draft.requirements.length} onClick={async () => { await setJob(draft); push('Job saved. Opening is available in Job Fit Reports.', 'ok') }}>Run assessment</button>{job && <Link to="/job-fit" className="btn-s ml-2 mt-4">View report</Link>}</>}</div></div></>
}
export function JobFit() {
  const { job, skills, fit, user } = useApp()
  if (!user) return <><PageHead title="Job Fit Report" /><NeedConnect /></>
  if (!job) return <><PageHead title="Job Fit Report" /><Empty title="No job analysed yet" text="Add a job description to compare it with your repository evidence." action={<Link className="btn-p" to="/job-analyzer">Analyse a job</Link>} /></>
  return <><PageHead title="Job Fit Report" sub={`${job.title} · ${job.company}`}>{job.sample && <DemoTag>Sample job</DemoTag>}</PageHead>
    <div className="card mb-4 p-5"><div className="flex flex-wrap items-center gap-6"><div className="font-head text-4xl font-bold text-teal">{fit.score}%</div><p className="max-w-xl text-sm text-ink2">Score = points earned ÷ maximum points. Required: demonstrated {POINTS.reqDemo}, partial {POINTS.reqPart}. Preferred: demonstrated {POINTS.prefDemo}, partial {POINTS.prefPart}. Not demonstrated 0. Currently {fit.got} of {fit.max}. This is a transparent heuristic, not a validated hiring prediction.</p></div>
      {job.sourceUrl && <p className="mt-2 break-all font-mono text-xs text-mute">Source: {job.sourceUrl}</p>}</div>
    <div className="space-y-3">{job.requirements.map(r => { const s = skills.find(x => x.name.toLowerCase() === r.name.toLowerCase()); return <div key={r.name} className="card p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{r.name}</h3><span className="rounded-full border border-line px-2 py-0.5 text-xs">{r.required ? 'Required' : 'Preferred'}</span><Badge s={s?.status || 'not_demonstrated'} />{s && <span className="text-xs text-ink2">Confidence {Math.round(s.confidence * 100)}%</span>}</div>
      {s?.evidence.map(e => <div key={e.file} className="mt-3"><div className="font-mono text-xs">{e.repo}/{e.file} · {e.commit}</div><Code>{e.excerpt}</Code><p className="mt-1 text-sm text-ink2">{e.explanation}</p></div>)}
      {(!s || s.status === 'not_demonstrated' || s.status === 'partial') && <p className="mt-2 text-sm text-part">{s?.gap || 'No repository evidence found in the analyzed scope.'}</p>}
      <p className="mt-2 text-xs text-mute">Last analysed: {fmt(s?.updatedAt)}</p></div> })}</div></>
}
export function Gaps() {
  const { job, skills, user } = useApp()
  if (!user) return <><PageHead title="Gap Report" /><NeedConnect /></>
  if (!job) return <><PageHead title="Gap Report" /><Empty title="No job selected" text="A gap report compares a job with your evidence." action={<Link className="btn-p" to="/job-analyzer">Analyse a job</Link>} /></>
  const rows = job.requirements.map(r => ({ r, s: skills.find(x => x.name.toLowerCase() === r.name.toLowerCase()) })).filter(x => x.s?.status !== 'demonstrated')
  const groups = [['Critical gaps', rows.filter(x => x.r.required && x.s?.status !== 'partial')], ['Moderate gaps', rows.filter(x => x.r.required && x.s?.status === 'partial')], ['Preferred-skill gaps', rows.filter(x => !x.r.required)]] as const
  return <><PageHead title="Gap Report" sub="A learning task never resolves a gap. A gap changes only after new evidence is analysed." />
    {groups.map(([t, list]) => <section key={t} className="mb-6"><h2 className="mb-2 font-semibold">{t} ({list.length})</h2>{!list.length && <p className="text-sm text-ink2">None.</p>}<div className="space-y-3">{list.map(({ r, s }) => <div key={r.name} className="card p-4"><div className="flex items-center gap-2"><h3 className="font-semibold">{r.name}</h3><Badge s={s?.status || 'not_demonstrated'} /></div>
      <p className="mt-2 text-sm">{s?.gap || 'No evidence in the analyzed scope. This is insufficient evidence, not proof of a missing skill.'}</p><p className="mt-1 text-sm text-ink2">Files inspected: {s?.evidence.length ? s.evidence.map(e => e.file).join(', ') : 'repository files; none matched'}</p>
      <p className="mt-1 text-sm text-ink2">Suggested improvement: {s?.improvement || 'Add a file in the repository that demonstrates this skill.'}</p><p className="mt-1 text-xs text-mute">Last assessed {fmt(s?.updatedAt)}</p></div>)}</div></section>)}</>
}
