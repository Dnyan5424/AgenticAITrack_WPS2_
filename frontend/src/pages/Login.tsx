import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GitBranch, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { authService } from '../services/authService'
import { USE_MOCK } from '../api/client'

type Mode = 'in' | 'up'

export default function Login() {
  const [mode, setMode] = useState<Mode>('in')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const { connectDemo, setAuthenticatedUser } = useApp()
  const navigate = useNavigate()

  const changeMode = (next: Mode) => {
    setMode(next)
    setSubmitError('')
    setErrors({})
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (mode === 'up' && !form.name.trim()) nextErrors.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (form.password.length < (mode === 'up' ? 8 : 1)) nextErrors.password = mode === 'up' ? 'Use at least 8 characters.' : 'Enter your password.'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    try {
      if (USE_MOCK) {
        await connectDemo()
      } else {
        const account = mode === 'up'
          ? await authService.register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
          : await authService.login({ email: form.email.trim(), password: form.password })
        setAuthenticatedUser(account)
      }
      navigate('/onboarding')
    } catch (error) {
      setSubmitError((error as Error).message || 'Unable to authenticate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text', autoComplete?: string) => (
    <div key={key}>
      <label htmlFor={key} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={key} type={type} autoComplete={autoComplete} className="input w-full" value={form[key]}
        aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined}
        onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
      {errors[key] && <p id={`${key}-error`} className="mt-1 text-xs text-err">{errors[key]}</p>}
    </div>
  )

  const duplicateEmail = submitError.toLowerCase().includes('already exists')

  return <div className="grid min-h-screen place-items-center p-4">
    <div className="card w-full max-w-md p-6">
      <Link to="/" className="mb-5 flex items-center gap-2 font-head text-lg font-semibold"><ShieldCheck className="text-teal" />SkillProof</Link>
      <div className="mb-4 flex gap-1 rounded-xl bg-soft p-1" role="tablist" aria-label="Account access">
        {(['in', 'up'] as const).map(item => <button key={item} type="button" role="tab" aria-selected={mode === item}
          onClick={() => changeMode(item)} className={`flex-1 rounded-lg py-2 text-sm ${mode === item ? 'bg-white font-medium shadow-sm' : 'text-ink2'}`}>
          {item === 'in' ? 'Sign in' : 'Create account'}
        </button>)}
      </div>
      <h1 className="mb-1 text-xl font-semibold">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mb-4 text-sm text-ink2">{mode === 'in' ? 'Sign in to continue your SkillProof workspace.' : 'Start with your name, email and a password.'}</p>
      <form onSubmit={submit} noValidate className="space-y-3">
        {mode === 'up' && field('name', 'Full name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', mode === 'up' ? 'new-password' : 'current-password')}
        {submitError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-err">
          <p>{submitError}</p>
          {duplicateEmail && <button type="button" className="mt-2 font-medium underline" onClick={() => changeMode('in')}>Sign in with this email</button>}
        </div>}
        <button className="btn-p w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
      </form>
      <div className="my-4 text-center text-xs text-mute">or</div>
      <button type="button" className="btn-s w-full" onClick={() => {
        if (USE_MOCK) void connectDemo().then(() => navigate('/onboarding'))
        else authService.loginWithGithub()
      }}><GitBranch size={16} />{USE_MOCK ? 'Continue' : 'Continue with GitHub'}</button>
      <p className="mt-3 text-center text-xs text-ink2">GitHub authorization lets SkillProof read your public repositories so you can choose which one to analyze.</p>
    </div>
  </div>
}
