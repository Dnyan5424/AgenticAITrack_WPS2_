import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { authService } from '../services/authService'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      await authService.requestPasswordReset(email.trim())
      setMessage('If an account exists for this email, a reset link has been sent. Check your inbox.')
    } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }
  return <div className="grid min-h-screen place-items-center p-4"><div className="card w-full max-w-md p-6">
    <Link to="/" className="mb-5 flex items-center gap-2 font-head text-lg font-semibold"><ShieldCheck className="text-teal" />SkillProof</Link>
    <h1 className="text-xl font-semibold">Reset your password</h1>
    <p className="my-2 text-sm text-ink2">Enter your account email and we’ll send a one-time reset link.</p>
    <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium" htmlFor="reset-email">Email</label>
      <input id="reset-email" className="input w-full" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      {error && <p role="alert" className="text-sm text-err">{error}</p>}{message && <p role="status" className="text-sm text-ok">{message}</p>}
      <button className="btn-p w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
    </form><Link className="mt-4 inline-block text-sm text-teal underline" to="/login">Back to sign in</Link>
  </div></div>
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuthenticatedUser } = useApp()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The passwords do not match.')
    setLoading(true)
    try {
      const user = await authService.resetPassword(token, password)
      setAuthenticatedUser(user)
      navigate('/onboarding', { replace: true })
    } catch (reason) { setError((reason as Error).message) } finally { setLoading(false) }
  }
  return <div className="grid min-h-screen place-items-center p-4"><div className="card w-full max-w-md p-6">
    <Link to="/" className="mb-5 flex items-center gap-2 font-head text-lg font-semibold"><ShieldCheck className="text-teal" />SkillProof</Link>
    <h1 className="text-xl font-semibold">Choose a new password</h1>
    {!token ? <p className="mt-3 text-sm text-err">This reset link is missing its token. <Link className="underline" to="/forgot-password">Request another link</Link>.</p> :
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm font-medium" htmlFor="new-password">New password</label>
        <input id="new-password" className="input w-full" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
        <label className="block text-sm font-medium" htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" className="input w-full" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} />
        {error && <p role="alert" className="text-sm text-err">{error}</p>}
        <button className="btn-p w-full" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
      </form>}
    <Link className="mt-4 inline-block text-sm text-teal underline" to="/login">Back to sign in</Link>
  </div></div>
}
