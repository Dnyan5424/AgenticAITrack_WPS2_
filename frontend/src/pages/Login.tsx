import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, GitBranch } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { authService } from '../services/authService'
import { USE_MOCK } from '../api/client'
import { DemoTag } from '../components/ui'
export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in'); const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState<Record<string, string>>({}); const [load, setLoad] = useState(false)
  const { connectDemo, push, setAuthenticatedUser } = useApp(); const nav = useNavigate()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const x: Record<string, string> = {}
    if (mode === 'up' && !f.name.trim()) x.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email address.'
    if (f.password.length < 8) x.password = 'Use at least 8 characters.'
    setErr(x); if (Object.keys(x).length) return
    setLoad(true)
    try {
      if (USE_MOCK) {
        push('Mock mode: email sign-in is not performed. Opening the demo workspace instead.')
        await connectDemo()
      } else {
        const account = mode === 'up'
          ? await authService.register({ name: f.name.trim(), email: f.email.trim(), password: f.password })
          : await authService.login({ email: f.email.trim(), password: f.password })
        setAuthenticatedUser(account)
      }
      nav('/dashboard')
    } catch (error) {
      push((error as Error).message || 'Unable to authenticate. Please try again.', 'err')
    } finally {
      setLoad(false)
    }
  }
  const field = (k: keyof typeof f, label: string, type = 'text') => <div><label htmlFor={k} className="mb-1 block text-sm font-medium">{label}</label><input id={k} type={type} className="input" value={f[k]} aria-invalid={!!err[k]} aria-describedby={err[k] ? k + '-e' : undefined} onChange={e => setF({ ...f, [k]: e.target.value })} />{err[k] && <p id={k + '-e'} className="mt-1 text-xs text-err">{err[k]}</p>}</div>
  return <div className="grid min-h-screen place-items-center p-4"><div className="card w-full max-w-md p-6">
    <Link to="/" className="mb-4 flex items-center gap-2 font-head text-lg font-semibold"><ShieldCheck className="text-teal" />SkillProof</Link>
    <div className="mb-4 flex gap-1 rounded-xl bg-soft p-1" role="tablist">{(['in', 'up'] as const).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-2 text-sm ${mode === m ? 'bg-white font-medium shadow-sm' : 'text-ink2'}`}>{m === 'in' ? 'Sign in' : 'Create account'}</button>)}</div>
    {USE_MOCK && <div className="mb-4"><DemoTag>Demo mode: nothing is authenticated</DemoTag></div>}
    <form onSubmit={submit} noValidate className="space-y-3">{mode === 'up' && field('name', 'Full name')}{field('email', 'Email', 'email')}{field('password', 'Password', 'password')}<button className="btn-p w-full" disabled={load}>{load ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button></form>
    <div className="my-4 text-center text-xs text-mute">or</div>
    <button className="btn-s w-full" onClick={async () => { if (USE_MOCK) { await connectDemo(); nav('/dashboard') } else authService.loginWithGithub() }}><GitBranch size={16} />Continue with GitHub</button>
  </div></div>
}
