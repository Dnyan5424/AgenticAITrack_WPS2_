import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Circle, Clock3, LoaderCircle, Sparkles } from 'lucide-react'
import { aiApi, type PersonalizedRoadmap, type RoadmapTask } from '../api/ai'
import { USE_MOCK } from '../api/client'
import { useApp } from '../context/AppContext'
import { Empty, PageHead } from '../components/ui'

const trustedResource = (url: string) => /^https:\/\/(www\.)?(developer\.mozilla\.org|react\.dev|nodejs\.org|expressjs\.com|www\.mongodb\.com|www\.freecodecamp\.org)\//i.test(url)

export default function AIRoadmap() {
  const { user } = useApp()
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('beginner')
  const [hours, setHours] = useState(7)
  const [duration, setDuration] = useState(6)
  const [skills, setSkills] = useState('')
  const [roadmap, setRoadmap] = useState<PersonalizedRoadmap | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string>()
  const [error, setError] = useState('')
  const live = Boolean(user && !user.demo && !USE_MOCK)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    void aiApi.currentRoadmap().then(result => { if (!cancelled) setRoadmap(result.roadmap) }).catch((cause: Error) => { if (!cancelled) setError(cause.message) })
    return () => { cancelled = true }
  }, [live])

  const generate = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await aiApi.generateRoadmap({ goal, currentLevel: level, hoursPerWeek: hours, durationWeeks: duration, skillsToImprove: skills.split(',').map(item => item.trim()).filter(Boolean) })
      setRoadmap(result.roadmap)
    } catch (cause) { setError((cause as Error).message) } finally { setLoading(false) }
  }

  const setTaskStatus = async (task: RoadmapTask) => {
    if (!roadmap || updating) return
    const status: RoadmapTask['status'] = task.status === 'completed' ? 'todo' : 'completed'
    setUpdating(task._id); setError('')
    try {
      const result = await aiApi.updateTask(roadmap._id, task._id, status)
      setRoadmap(result.roadmap)
    } catch (cause) { setError((cause as Error).message) } finally { setUpdating(undefined) }
  }

  const allTasks = roadmap?.weeks.flatMap(week => week.tasks) || []
  const completed = allTasks.filter(task => task.status === 'completed').length
  const progress = allTasks.length ? Math.round(completed / allTasks.length * 100) : 0

  return <>
    <PageHead title="AI Learning Roadmap" sub="Build a practical learning plan around your goals, schedule, skill gaps, and repository evidence." />
    {!live ? <div className="card p-6"><p className="font-medium">Sign in with an authenticated account to generate a personalized roadmap.</p><p className="mt-2 text-sm text-ink2">Roadmap generation requires an authenticated backend account.</p></div> : <>
      <form onSubmit={generate} className="card mb-6 space-y-5 p-5 sm:p-7">
        <div><h2 className="font-semibold">Plan your next move</h2><p className="mt-1 text-sm text-ink2">The backend adds selected saved assessment snippets; they and your planning inputs are sent to Google Gemini. You don’t need to paste repository code.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Target role<input required maxLength={180} value={goal} onChange={event => setGoal(event.target.value)} className="input" placeholder="Backend Developer" /></label>
          <label className="space-y-1.5 text-sm font-medium">Current level<select value={level} onChange={event => setLevel(event.target.value)} className="input"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <label className="space-y-1.5 text-sm font-medium">Study hours per week<input type="number" min={1} max={80} value={hours} onChange={event => setHours(Number(event.target.value))} className="input" /></label>
          <label className="space-y-1.5 text-sm font-medium">Plan duration<select value={duration} onChange={event => setDuration(Number(event.target.value))} className="input">{[2, 4, 6, 8, 10, 12].map(value => <option key={value} value={value}>{value} weeks</option>)}</select></label>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">Skills to focus on<input value={skills} onChange={event => setSkills(event.target.value)} className="input" placeholder="REST APIs, testing, MongoDB" /><span className="block text-xs font-normal text-mute">Optional; separate skills with commas.</span></label>
        <button className="btn-p" disabled={loading}>{loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{loading ? 'Building your plan… this may take up to 2 minutes' : roadmap ? 'Regenerate roadmap' : 'Generate roadmap'}</button>
      </form>
      {error && <p role="alert" className="mb-4 text-sm text-err">{error}</p>}
      {!roadmap ? <Empty title="Your roadmap will appear here" text="Generate a plan to turn your target role into weekly practice and measurable projects." /> : <>
        <section className="card mb-6 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wider text-teal">Your plan</p><h2 className="mt-2 text-xl font-semibold">{roadmap.goal}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-ink2">{roadmap.summary}</p></div><div className="rounded-xl bg-inset px-4 py-3 text-center"><p className="text-2xl font-semibold text-teal">{progress}%</p><p className="text-xs text-ink2">Complete</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-ink2">{completed} of {allTasks.length} tasks completed · {roadmap.hoursPerWeek} study hours/week · {roadmap.durationWeeks} weeks</p>
          {!!roadmap.skillsToImprove.length && <div className="mt-5 flex flex-wrap gap-2">{roadmap.skillsToImprove.map(skill => <span key={skill} className="rounded-full border border-line bg-inset px-3 py-1 text-xs">{skill}</span>)}</div>}
        </section>
        <section className="space-y-4"><h2 className="font-semibold">Weekly plan</h2>{roadmap.weeks.map(week => <article key={week._id || week.week} className="card p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft font-mono text-sm font-semibold text-teal">{String(week.week).padStart(2, '0')}</span><div><h3 className="font-semibold">{week.title}</h3><p className="mt-1 text-sm text-ink2">{week.objective}</p></div></div><div className="mt-4 space-y-3">{week.tasks.map(task => <div key={task._id} className="flex items-start gap-3 rounded-xl border border-line p-4"><button type="button" onClick={() => void setTaskStatus(task)} disabled={Boolean(updating)} aria-label={`Mark ${task.title} ${task.status === 'completed' ? 'incomplete' : 'complete'}`} className="mt-0.5 text-teal disabled:opacity-50">{task.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button><div className="min-w-0 flex-1"><h4 className={task.status === 'completed' ? 'text-sm font-medium text-mute line-through' : 'text-sm font-medium'}>{task.title}</h4><p className="mt-1 text-sm leading-6 text-ink2">{task.description}</p>{task.exercise && <p className="mt-2 text-sm"><strong>Practice:</strong> {task.exercise}</p>}{task.completionCriteria && <p className="mt-2 text-xs text-ink2"><strong>Done when:</strong> {task.completionCriteria}</p>}<div className="mt-3 flex items-center gap-3 text-xs text-mute"><span><Clock3 size={13} className="mr-1 inline" />{task.estimatedMinutes} min</span>{task.resourceUrl && trustedResource(task.resourceUrl) && <a href={task.resourceUrl} target="_blank" rel="noreferrer" className="text-teal underline">Learning resource</a>}</div></div></div>)}</div></article>)}</section>
      </>}
    </>}
  </>
}
