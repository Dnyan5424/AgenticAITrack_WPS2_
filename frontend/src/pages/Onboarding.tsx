import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, GitBranch, LoaderCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { USE_MOCK } from '../api/client'
import { githubService } from '../services/githubService'
import { authService } from '../services/authService'
import { repositoryService } from '../services/repositoryService'
import type { Repository } from '../types'

export default function Onboarding() {
  const { user, repo, repositories, setRepo, setRepositories, connectDemo } = useApp()
  const navigate = useNavigate()
  const [available, setAvailable] = useState<Repository[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [githubConnected, setGithubConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    if (USE_MOCK) {
      void githubService.repositories().then(items => {
        setAvailable(items)
        setGithubConnected(true)
        const connectedIds = new Set(repositories.map(item => item.id))
        const connected = items.filter(item => connectedIds.has(item.id))
        setSelected(connected.length ? connected.map(item => item.id) : items.slice(0, 1).map(item => item.id))
      })
      return
    }
    let active = true
    setLoading(true)
    Promise.all([githubService.connection(), repositoryService.list()])
      .then(([connection, connectedRepos]) => {
        if (!active) return
        setGithubConnected(connection.connected)
        if (connection.connected) {
          return githubService.repositories().then(items => {
            if (!active) return
            setAvailable(items)
            setRepositories(connectedRepos)
            const linkedNames = new Set(connectedRepos.map(item => item.repoFullName || item.name))
            const linkedIds = items.filter(item => linkedNames.has(item.repoFullName || item.name)).map(item => item.id)
            setSelected(linkedIds.length ? linkedIds : items.slice(0, 1).map(item => item.id))
            const activeRepo = connectedRepos.find(item => item.id === repo?.id) || connectedRepos[0]
            if (activeRepo) void setRepo(activeRepo)
          })
        }
        setAvailable([])
        setRepositories([])
      })
      .catch(reason => { if (active) setError((reason as Error).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, repo?.id, setRepo, setRepositories])

  const connect = async () => {
    setError('')
    if (USE_MOCK) { await connectDemo(); return }
    authService.loginWithGithub()
  }

  const chooseRepository = async () => {
    if (!selected.length) return setError('Choose at least one public repository to continue.')
    setError(''); setLoading(true)
    try {
      if (USE_MOCK) {
        const chosenRepositories = available.filter(item => selected.includes(item.id))
        const selectedById = new Map([...repositories, ...chosenRepositories].map(item => [item.id, item]))
        setRepositories([...selectedById.values()])
        const chosen = chosenRepositories.find(item => item.id === repo?.id) || chosenRepositories[0]
        if (!chosen) throw new Error('Choose at least one public repository to continue.')
        await setRepo(chosen)
      } else {
        const existing = new Set(repositories.map(item => item.repoFullName || item.name))
        for (const githubId of selected) {
          const candidate = available.find(item => item.id === githubId)
          if (candidate && !existing.has(candidate.repoFullName || candidate.name)) {
            await githubService.connectRepo(githubId)
          }
        }
        const owned = await repositoryService.list()
        setRepositories(owned)
        const requested = available.find(item => item.id === selected[0])
        const chosen = owned.find(item => item.repoFullName === requested?.repoFullName) || owned[0]
        if (!chosen) throw new Error('The repository was not saved. Please try again.')
        await setRepo(chosen)
      }
      navigate('/dashboard')
    } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }

  if (!user) return <div className="grid min-h-screen place-items-center p-4"><div className="card max-w-md p-6 text-center">
    <h1 className="text-xl font-semibold">Sign in to continue</h1><p className="my-3 text-sm text-ink2">Your onboarding steps are linked to your account.</p>
    <Link className="btn-p" to="/login">Go to sign in</Link>
  </div></div>

  const steps = [
    { title: 'Connect GitHub', complete: githubConnected },
    { title: 'Choose public repositories', complete: repositories.length > 0 },
    { title: 'Add a job description', complete: false }
  ]

  return <div className="mx-auto grid min-h-screen max-w-2xl content-center gap-6 p-4 sm:gap-7 sm:p-8">
    <Link to="/" className="flex items-center gap-2 font-head text-lg font-semibold"><GitBranch className="text-teal" />SkillProof</Link>
    <div><p className="text-sm font-medium text-teal">Welcome, {user.name}</p><h1 className="page-title mt-2">Set up your evidence workspace</h1>
      <p className="page-description">Connect GitHub, add one or more public repositories, then compare their combined evidence with a job role.</p></div>
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Onboarding progress">
      {steps.map((step, index) => <li key={step.title} className="card flex items-center gap-3 p-4 text-sm leading-5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${step.complete ? 'bg-green-100 text-ok' : 'bg-soft text-ink2'}`}>{step.complete ? <Check size={15} /> : index + 1}</span>{step.title}
      </li>)}
    </ol>
    <section className="card space-y-5 p-5 sm:p-6">
      <div><h2 className="font-semibold">1. Connect GitHub</h2><p className="mt-1 text-sm text-ink2">SkillProof requests basic profile and email access. Repository contents are read only for repositories you choose, and only public repositories are supported.</p></div>
      {!githubConnected ? <button className="btn-p" onClick={() => void connect()} disabled={loading}>{USE_MOCK ? 'Continue' : 'Authorize GitHub'}</button> : <p className="text-sm text-ok">{user.demo ? 'Account ready.' : `GitHub connected${user.githubLogin ? ` as ${user.githubLogin}` : ''}.`}</p>}
      {githubConnected && <>
        <div><h2 className="font-semibold">2. Add public repositories</h2><p className="mt-1 text-sm text-ink2">Select one or more repositories. Their evidence can contribute together to job-fit assessments.</p></div>
        {loading && <p className="flex items-center gap-2 text-sm text-ink2"><LoaderCircle size={15} className="animate-spin" />Loading repositories…</p>}
        {!loading && available.length === 0 && <p className="text-sm text-ink2">No public repositories were found on this GitHub account.</p>}
        {available.length > 0 && <div className="quiet-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1">{available.map(item => {
          const linked = repositories.some(repository => (repository.repoFullName || repository.name) === (item.repoFullName || item.name))
          return <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-[#c9d3c9] hover:bg-soft has-[:checked]:border-teal/40 has-[:checked]:bg-teal-light/35">
          <input type="checkbox" className="h-4 w-4 accent-teal" name="repositories" value={item.id} checked={selected.includes(item.id)} onChange={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} />
          <span className="min-w-0 flex-1"><span className="block truncate font-mono text-sm font-medium">{item.name}</span><span className="text-xs text-ink2">{item.language || 'Unknown language'} · public{linked ? ' · connected' : ''}</span></span>
        </label>})}</div>}
        <button className="btn-p" onClick={() => void chooseRepository()} disabled={loading || !available.length || !selected.length}>{loading ? 'Adding repositories…' : 'Add selected repositories'}</button>
      </>}
      {error && <p role="alert" className="text-sm text-err">{error}</p>}
    </section>
    <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div><h2 className="font-semibold">3. Analyze a job role</h2><p className="mt-1 text-sm text-ink2">Enter a role or job URL; SkillProof will compare its skills with evidence across connected repositories.</p></div>
      <button className="btn-s" disabled={!repo} onClick={() => navigate('/job-analyzer')}>Continue to job</button>
    </section>
    <div className="flex justify-between text-sm"><Link className="text-teal underline" to="/settings">Account settings</Link><button className="text-ink2 underline" onClick={() => void navigate('/dashboard')}>Do this later</button></div>
  </div>
}
