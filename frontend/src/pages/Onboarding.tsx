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
  const { user, repo, setRepo, connectDemo } = useApp()
  const navigate = useNavigate()
  const [available, setAvailable] = useState<Repository[]>([])
  const [selected, setSelected] = useState('')
  const [githubConnected, setGithubConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    if (USE_MOCK) {
      void githubService.repositories().then(items => { setAvailable(items); setGithubConnected(true); setSelected(items[0]?.id || '') })
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
            const linked = connectedRepos[0]
            setRepo(linked || null)
            setSelected(items.find(item => item.repoFullName === linked?.name)?.id || items[0]?.id || '')
          })
        }
        setAvailable([])
      })
      .catch(reason => { if (active) setError((reason as Error).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, setRepo])

  const connect = async () => {
    setError('')
    if (USE_MOCK) { await connectDemo(); return }
    authService.loginWithGithub()
  }

  const chooseRepository = async () => {
    if (!selected) return setError('Choose a public repository to continue.')
    setError(''); setLoading(true)
    try {
      if (USE_MOCK) {
        const chosen = available.find(item => item.id === selected) || available[0]
        setRepo(chosen)
      } else {
        await githubService.connectRepo(selected)
        const owned = await repositoryService.list()
        const githubRepo = available.find(item => item.id === selected)
        const chosen = owned.find(item => item.name === githubRepo?.repoFullName) || owned[0]
        if (!chosen) throw new Error('The repository was not saved. Please try again.')
        setRepo(chosen)
      }
      navigate('/job-analyzer')
    } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }

  if (!user) return <div className="grid min-h-screen place-items-center p-4"><div className="card max-w-md p-6 text-center">
    <h1 className="text-xl font-semibold">Sign in to continue</h1><p className="my-3 text-sm text-ink2">Your onboarding steps are linked to your account.</p>
    <Link className="btn-p" to="/login">Go to sign in</Link>
  </div></div>

  const steps = [
    { title: 'Connect GitHub', complete: githubConnected },
    { title: 'Choose a public repository', complete: Boolean(repo) },
    { title: 'Add a job description', complete: false }
  ]

  return <div className="mx-auto grid min-h-screen max-w-2xl content-center gap-5 p-4 sm:p-8">
    <Link to="/" className="flex items-center gap-2 font-head text-lg font-semibold"><GitBranch className="text-teal" />SkillProof</Link>
    <div><p className="text-sm font-medium text-teal">Welcome, {user.name}</p><h1 className="mt-1 text-3xl font-semibold">Set up your evidence workspace</h1>
      <p className="mt-2 text-sm text-ink2">Connect GitHub, select a public repository, then compare its evidence with a job description.</p></div>
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Onboarding progress">
      {steps.map((step, index) => <li key={step.title} className="card flex items-center gap-2 p-3 text-sm">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${step.complete ? 'bg-green-100 text-ok' : 'bg-soft text-ink2'}`}>{step.complete ? <Check size={15} /> : index + 1}</span>{step.title}
      </li>)}
    </ol>
    <section className="card space-y-4 p-5">
      <div><h2 className="font-semibold">1. Connect GitHub</h2><p className="mt-1 text-sm text-ink2">SkillProof requests basic profile and email access. Repository contents are read only for repositories you choose, and only public repositories are supported.</p></div>
      {!githubConnected ? <button className="btn-p" onClick={() => void connect()} disabled={loading}>{USE_MOCK ? 'Connect demo account' : 'Authorize GitHub'}</button> : <p className="text-sm text-ok">GitHub connected{user.githubLogin ? ` as ${user.githubLogin}` : ''}.</p>}
      {githubConnected && <>
        <div><h2 className="font-semibold">2. Choose a public repository</h2><p className="mt-1 text-sm text-ink2">Select one repository to connect to this workspace.</p></div>
        {loading && <p className="flex items-center gap-2 text-sm text-ink2"><LoaderCircle size={15} className="animate-spin" />Loading repositories…</p>}
        {!loading && available.length === 0 && <p className="text-sm text-ink2">No public repositories were found on this GitHub account.</p>}
        {available.length > 0 && <div className="max-h-64 space-y-2 overflow-y-auto">{available.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-soft">
          <input type="radio" name="repository" value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} />
          <span className="min-w-0 flex-1"><span className="block truncate font-mono text-sm font-medium">{item.name}</span><span className="text-xs text-ink2">{item.language || 'Unknown language'} · public</span></span>
        </label>)}</div>}
        <button className="btn-p" onClick={() => void chooseRepository()} disabled={loading || !available.length}>{loading ? 'Saving…' : 'Connect selected repository'}</button>
      </>}
      {error && <p role="alert" className="text-sm text-err">{error}</p>}
    </section>
    <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div><h2 className="font-semibold">3. Add a job description</h2><p className="mt-1 text-sm text-ink2">Paste the job description; SkillProof will extract skills and assess your connected repository.</p></div>
      <button className="btn-s" disabled={!repo} onClick={() => navigate('/job-analyzer')}>Continue to job</button>
    </section>
    <div className="flex justify-between text-sm"><Link className="text-teal underline" to="/settings">Account settings</Link><button className="text-ink2 underline" onClick={() => void navigate('/dashboard')}>Do this later</button></div>
  </div>
}
