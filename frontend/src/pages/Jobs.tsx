import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { jobService } from '../services/jobService'
import { Badge, PageHead, NeedConnect, Empty, Meta, Code, fmt } from '../components/ui'
import type { JobPosting } from '../types'
import { POINTS } from '../utils'
import { USE_MOCK } from '../api/client'
export function JobAnalyzer() {
  const { user, job, setJob } = useApp()
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const [load, setLoad] = useState(false)
  const [draft, setDraft] = useState<JobPosting | null>(job)
  const [tag, setTag] = useState('')
  if (!user) return <><PageHead title="Job Analyzer & Fit" /><NeedConnect /></>

  const run = async () => {
    if (!url.trim()) return setErr('Enter the URL of a job posting to continue.')
    try {
      const parsedUrl = new URL(url.trim())
      if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
        return setErr('Enter a public job-posting URL starting with http:// or https://.')
      }
    } catch {
      return setErr('Enter a valid job-posting URL starting with http:// or https://.')
    }
    setErr('')
    setLoad(true)
    try {
      const analyzed = await jobService.analyze({ url: url.trim() })
      if (!analyzed.requirements.length) setErr('No known skills were found. Add skill tags manually below.')
      setDraft(analyzed)
    } catch (error) {
      setErr((error as Error).message)
    } finally {
      setLoad(false)
    }
  }
  const edit = (update: (posting: JobPosting) => JobPosting) => draft && setDraft(update(draft))
  const assess = async () => {
    if (!draft) return
    setErr('')
    setLoad(true)
    try {
      await setJob(draft)
    } catch (error) {
      setErr((error as Error).message)
    } finally {
      setLoad(false)
    }
  }

  return <>
    <PageHead title="Job Analyzer & Fit" sub="Enter a public job-posting URL to extract its skills, then compare them with your repository evidence." />
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <form className="card space-y-5 p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void run() }}>
        <div>
          <label htmlFor="job-url" className="mb-2 block text-sm font-semibold">Job posting URL</label>
          <input id="job-url" type="url" className="input" placeholder="https://company.com/careers/role" value={url} onChange={event => setUrl(event.target.value)} required />
          <p className="mt-2 text-xs leading-5 text-ink2">Public listings are read when accessible. Role-guide URLs can still suggest a job title and skills from their URL words.</p>
          <p className="mt-2 text-xs leading-5 text-ink2">If a listing can’t be read, SkillProof may still infer a role from words in the URL.</p>
        </div>
        {err && <p role="alert" className="text-sm text-err">{err}</p>}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button className="btn-p" type="submit" disabled={load}>{load ? 'Reading job posting…' : 'Analyze job URL'}</button>
          {USE_MOCK && <button className="btn-s" type="button" onClick={() => { setDraft(jobService.sample()); setUrl(''); setErr('') }}>Use example job</button>}
        </div>
      </form>
      <div className="card min-h-[190px] p-5 sm:p-6">
        {!draft ? <div className="flex min-h-[140px] flex-col justify-center"><h2 className="font-display text-lg font-semibold tracking-tight">Job details</h2><p className="mt-2 max-w-sm text-sm leading-6 text-ink2">Add a public job URL to see its title and extracted skills here.</p></div> : <>
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold tracking-tight">{draft.title}</h2><p className="mt-1 text-sm text-ink2">{draft.company}</p></div></div>
          <p className="mt-1 break-all font-mono text-xs text-ink2">{draft.sourceUrl || 'No source URL provided'}</p>
          {draft.analysisNote && <p className="mt-2 rounded-lg bg-[#F3F8F4] px-3 py-2 text-sm text-[#31574D]">{draft.analysisNote}</p>}
          {(['Required', 'Preferred'] as const).map(group => <div key={group} className="mt-4">
            <div className="mb-1 text-xs text-mute">{group} skills</div>
            <div className="flex flex-wrap gap-2">{draft.requirements.filter(requirement => requirement.required === (group === 'Required')).map(requirement => <span key={requirement.name} className="inline-flex items-center gap-1 rounded-full bg-teal-light px-3 py-1 text-xs text-teal">{requirement.name}<button aria-label={`Remove ${requirement.name}`} onClick={() => edit(posting => ({ ...posting, requirements: posting.requirements.filter(item => item.name !== requirement.name) }))}><X size={12} /></button></span>)}</div>
          </div>)}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <input aria-label="Add skill" className="input min-w-[150px] flex-1" placeholder="Add skill" value={tag} onChange={event => setTag(event.target.value)} />
            <button className="btn-s" onClick={() => { if (tag.trim()) { edit(posting => ({ ...posting, requirements: [...posting.requirements, { name: tag.trim(), required: true }] })); setTag('') } }}><Plus size={14} />Required</button>
            <button className="btn-s" onClick={() => { if (tag.trim()) { edit(posting => ({ ...posting, requirements: [...posting.requirements, { name: tag.trim(), required: false }] })); setTag('') } }}>Preferred</button>
          </div>
          <button className="btn-p mt-4" disabled={!draft.requirements.length || load} onClick={() => void assess()}>{load ? 'Assessing repository evidence… this may take up to 2 minutes' : 'Run assessment'}</button>
        </>}
      </div>
    </div>
    <section id="job-fit-report" className="mt-10 scroll-mt-24" aria-live="polite">
      <JobFit embedded />
    </section>
  </>
}

export function JobFit({ embedded = false }: { embedded?: boolean }) {
  const { job, skills, fit, user } = useApp()
  if (!user) return embedded ? null : <><PageHead title="Job Fit Report" /><NeedConnect /></>
  if (!job) return embedded
    ? <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center"><h2 className="font-semibold">Your fit report will appear here</h2><p className="mt-1 text-sm text-ink2">Extract job skills above, then run an assessment to compare them with your repository evidence.</p></div>
    : <><PageHead title="Job Fit Report" /><Empty title="No job analysed yet" text="Add a job description to compare it with your repository evidence." action={<Link className="btn-p" to="/job-analyzer">Analyse a job</Link>} /></>
  return <>
    {embedded
      ? <div className="mb-4"><h2 className="font-display text-lg font-semibold tracking-tight">Job fit report</h2><p className="mt-1 text-sm text-ink2"><span className="font-medium text-ink">Role:</span> {job.title} · {job.company}</p></div>
      : <PageHead title="Job Fit Report" sub={`Role: ${job.title} · ${job.company}`} />}
    <details className="card group mb-4 p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold text-ink marker:text-teal focus-visible:outline-offset-4">How the estimate works</summary>
      <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm leading-6 text-ink2">
        <p>The Job Fit score is a transparent points-based calculation, not a trained machine-learning prediction. Required skills earn 10 points when demonstrated or 5 when partially demonstrated; preferred skills earn 3 or 1. Skills without matching evidence earn 0. The percentage is points earned divided by the maximum available.</p>
        <p>Role suggestions use a separate ranking. In the role-catalog recommender, verified-skill coverage contributes 80%, and TF-IDF cosine similarity between repository evidence and role descriptions contributes 20%. TF-IDF gives more weight to terms that are distinctive across the catalog; cosine similarity compares how closely the text vectors align. Built-in role suggestions use skill coverage only. Neither method is trained on hiring outcomes or estimates hiring probability.</p>
      </div>
    </details>
    <div className="card mb-4 p-5"><div className="flex flex-wrap items-center gap-6"><div className="font-head text-4xl font-bold text-teal">{fit.score}%</div><p className="max-w-xl text-sm text-ink2">Score = points earned ÷ maximum points. Required: demonstrated {POINTS.reqDemo}, partial {POINTS.reqPart}. Preferred: demonstrated {POINTS.prefDemo}, partial {POINTS.prefPart}. Not demonstrated 0. Currently {fit.got} of {fit.max}. This is a transparent heuristic, not a validated hiring prediction.</p></div>
      {job.sourceUrl && <p className="mt-2 break-all font-mono text-xs text-mute">Source: {job.sourceUrl}</p>}</div>
    <div className="space-y-3">{job.requirements.map(requirement => {
      const assessment = skills.find(item => item.name.toLowerCase() === requirement.name.toLowerCase())
      return <div key={requirement.name} className="card p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{requirement.name}</h3><span className="rounded-full border border-line px-2 py-0.5 text-xs">{requirement.required ? 'Required' : 'Preferred'}</span><Badge s={assessment?.status || 'not_demonstrated'} />{assessment && <span className="text-xs text-ink2">Confidence {Math.round(assessment.confidence * 100)}%</span>}</div>
        {assessment?.evidence.map(evidence => <div key={evidence.file} className="mt-3"><div className="font-mono text-xs">{evidence.repo}/{evidence.file} · {evidence.commit}</div><Code>{evidence.excerpt}</Code><p className="mt-1 text-sm text-ink2">{evidence.explanation}</p></div>)}
        {(!assessment || assessment.status === 'not_demonstrated' || assessment.status === 'partial') && <p className="mt-2 text-sm text-part">{assessment?.gap || 'No repository evidence found in the analyzed scope.'}</p>}
        <p className="mt-2 text-xs text-mute">Last analysed: {fmt(assessment?.updatedAt)}</p>
      </div>
    })}</div>
  </>
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
