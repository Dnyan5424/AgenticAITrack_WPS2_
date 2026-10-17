import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { USE_MOCK } from '../api/client'
import type { Freshness, JobPosting, Repository, RepositoryChange, RoadmapTask, SkillAssessment, User } from '../types'
import { authService } from '../services/authService'
import { githubService } from '../services/githubService'
import { repositoryService } from '../services/repositoryService'
import { jobService } from '../services/jobService'
import { skillService } from '../services/skillService'
import { roadmapService } from '../services/roadmapService'
import { M } from '../services/store'
import { fitScore } from '../utils'
export interface Toast { id: number; msg: string; tone: 'ok' | 'err' | 'info' }
interface Ctx {
  user: User | null; repo: Repository | null; job: JobPosting | null; skills: SkillAssessment[]; changes: RepositoryChange[]; tasks: RoadmapTask[]
  freshness: Freshness; lastAssessed?: string; busy: boolean; toasts: Toast[]; fit: ReturnType<typeof fitScore>
  connectDemo(): Promise<void>; disconnect(): Promise<void>; signOut(): Promise<void>; deleteAccount(): Promise<void>; setRepo(repo: Repository | null): void; setJob(j: JobPosting): Promise<void>; analyzeRepo(): Promise<void>; simulateCommit(): void
  setAuthenticatedUser(user: User): void; toggleTask(id: string): void; push(msg: string, tone?: Toast['tone']): void; dismiss(id: number): void; setSkills(s: SkillAssessment[]): void
}
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)
export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [repo, setRepo] = useState<Repository | null>(null)
  const [job, setJobS] = useState<JobPosting | null>(null)
  const [skills, setSkills] = useState<SkillAssessment[]>([])
  const [changes, setChanges] = useState<RepositoryChange[]>([])
  const [tasks, setTasks] = useState<RoadmapTask[]>([])
  const [freshness, setFresh] = useState<Freshness>('fresh')
  const [lastAssessed, setLast] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const n = useRef(0)
  const sessionInitialized = useRef(false)
  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id))
  const push = useCallback((msg: string, tone: Toast['tone'] = 'info') => { const id = ++n.current; setToasts(t => [...t, { id, msg, tone }]); setTimeout(() => dismiss(id), 4500) }, [])
  useEffect(() => {
    if (sessionInitialized.current) return
    sessionInitialized.current = true
    const returnedFromOAuth = authService.consumeOAuthCallback()
    if (USE_MOCK || (!returnedFromOAuth && !authService.hasToken())) return
    setBusy(true)
    authService.me()
      .then(async account => {
        const [connection, repositories, jobs, assessments] = await Promise.all([
          githubService.connection(), repositoryService.list(), jobService.list(), skillService.list()
        ])
        setUser({ ...account, githubLogin: connection.login || account.githubLogin, demo: false })
        setRepo(repositories[0] || null)
        setJobS(jobs[0] || null)
        setSkills(assessments)
        if (repositories[0]?.analyzedAt) setLast(repositories[0].analyzedAt)
        if (returnedFromOAuth) {
          if (!connection.connected) throw new Error('GitHub account is not connected. Please authorize GitHub again.')
          push(`Connected GitHub account ${connection.login || account.name}.`, 'ok')
          navigate('/onboarding', { replace: true })
        }
      })
      .catch(error => push((error as Error).message, 'err'))
      .finally(() => setBusy(false))
  }, [navigate, push])
  const connectDemo = async () => {
    setBusy(true)
    try { const [u, repos, s, t] = await Promise.all([authService.connectDemo(), githubService.repositories(), skillService.careerDna(), roadmapService.get('j1')]); setUser(u); setRepo(repos[0]); setSkills(s); setTasks(t); setLast(new Date().toISOString()); push('Demo GitHub account connected. Data is simulated.', 'info') }
    catch (e) { push((e as Error).message, 'err') } finally { setBusy(false) }
  }
  const clearWorkspace = () => { setRepo(null); setSkills([]); setChanges([]); setJobS(null); setTasks([]); setLast(undefined) }
  const disconnect = async () => {
    if (!USE_MOCK) await githubService.disconnectAccount()
    clearWorkspace()
    setUser(current => current ? { ...current, githubLogin: undefined } : null)
    push('GitHub disconnected. Your account remains signed in.')
  }
  const signOut = async () => {
    try { await authService.logout() } finally { clearWorkspace(); setUser(null); navigate('/login', { replace: true }) }
  }
  const deleteAccount = async () => {
    await authService.deleteAccount()
    clearWorkspace(); setUser(null); navigate('/login', { replace: true })
  }
  const setAuthenticatedUser = (account: User) => {
    setUser({ ...account, demo: false })
    push(`Welcome, ${account.name}.`, 'ok')
  }
  const setJob = async (j: JobPosting) => {
    if (!USE_MOCK && !j.sample) {
      await jobService.update(j.id, j.requirements)
      const report = await jobService.assess(j.id)
      if (report?.skills) setSkills(report.skills)
    }
    setJobS(j); setLast(new Date().toISOString()); push('Assessment complete for ' + j.title)
  }
  const analyzeRepo = async () => { setBusy(true); await new Promise(r => setTimeout(r, 900)); setRepo(r => r && { ...r, analyzedSha: r.latestSha, analyzedAt: new Date().toISOString() }); setLast(new Date().toISOString()); setFresh('fresh'); setBusy(false); push('Repository analysed.', 'ok') }
  const simulateCommit = () => {
    if (!repo || freshness === 'in_progress') return
    const c = M.newCommit(); const id = 'ch' + Date.now()
    const affected = ['SQL', 'Automated testing']
    const before = Object.fromEntries(skills.map(s => [s.name, s.status])) as RepositoryChange['before']
    setRepo(r => r && { ...r, latestSha: c.sha, commits: [c, ...r.commits], files: [...r.files, ...M.commitFiles] })
    setChanges(x => [{ id, repo: repo.name, message: c.message, sha: c.sha, files: c.files, affected, before, state: 'reassessing', detectedAt: c.date, simulated: true }, ...x])
    setSkills(s => s.map(k => affected.includes(k.name) ? { ...k, previous: k.status, status: 'under_review' } : k))
    setFresh('in_progress'); push('Simulated commit detected. Reassessing SQL and Automated testing only.')
    setTimeout(() => {
      setSkills(s => { const base = s.map(k => affected.includes(k.name) ? { ...k, status: k.previous ?? 'not_demonstrated' } : k); const out = M.reassessed(base)
        setChanges(x => x.map(ch => ch.id === id ? { ...ch, state: 'complete', completedAt: new Date().toISOString(), after: Object.fromEntries(out.map(k => [k.name, k.status])) as RepositoryChange['before'] } : ch)); return out })
      setRepo(r => r && { ...r, analyzedSha: c.sha, analyzedAt: new Date().toISOString() }); setLast(new Date().toISOString()); setFresh('fresh'); push('Reassessment complete. Two skills updated; others unchanged.', 'ok')
    }, 2800)
  }
  const toggleTask = (id: string) => { const t = tasks.find(x => x.id === id); if (!t) return; setTasks(ts => ts.map(x => x.id === id ? { ...x, done: !x.done } : x)); roadmapService.toggle(id, !t.done).catch(e => push(e.message, 'err')) }
  const fit = useMemo(() => fitScore(job, skills), [job, skills])
  return <C.Provider value={{ user, repo, job, skills, changes, tasks, freshness, lastAssessed, busy, toasts, fit, connectDemo, disconnect, signOut, deleteAccount, setRepo, setAuthenticatedUser, setJob, analyzeRepo, simulateCommit, toggleTask, push, dismiss, setSkills }}>{children}</C.Provider>
}
