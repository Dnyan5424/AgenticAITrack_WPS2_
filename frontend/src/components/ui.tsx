import { type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Info, X, Plug } from 'lucide-react'
import { cn, STATUS_CLASS, STATUS_LABEL, fmt } from '../utils'
import type { Freshness, Status } from '../types'
import { useApp } from '../context/AppContext'
import { USE_MOCK } from '../api/client'
import { authService } from '../services/authService'
export const Badge = ({ s }: { s: Status }) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', STATUS_CLASS[s])}>{STATUS_LABEL[s]}</span>
const FR: Record<Freshness, [string, string]> = { fresh: ['Up to date', 'text-ok bg-green-50 border-green-200'], changes: ['Changes detected', 'text-part bg-amber-light border-amber-200'], in_progress: ['Reassessment in progress', 'text-review bg-blue-50 border-blue-200'], failed: ['Reassessment failed', 'text-err bg-red-50 border-red-200'] }
export const Fresh = ({ f }: { f: Freshness }) => <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', FR[f][1])}><span className={cn('h-1.5 w-1.5 rounded-full bg-current', f === 'in_progress' && 'animate-pulse')} />{FR[f][0]}</span>
export const DemoTag = ({ children = 'Illustrative demo data' }: { children?: ReactNode }) => <span className="inline-flex rounded-full border border-amber/30 bg-amber-light px-2.5 py-0.5 text-xs font-medium text-part">{children}</span>
export const PageHead = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-sm text-ink2">{sub}</p>}</div><div className="flex flex-wrap gap-2">{children}</div></div>)
export const Empty = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => <div className="card flex flex-col items-center px-6 py-12 text-center"><div className="mb-3 rounded-full bg-teal-light p-3 text-teal"><Plug size={20} /></div><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm text-ink2">{text}</p>{action && <div className="mt-4">{action}</div>}</div>
export function NeedConnect() { const { connectDemo, busy } = useApp(); return <Empty title="Connect a GitHub account first" text={USE_MOCK ? 'SkillProof needs repository evidence. Demo mode uses a simulated account and sample data.' : 'Authorize GitHub to load your public repositories and account.'} action={<div className="flex gap-2"><button className="btn-p" onClick={() => USE_MOCK ? connectDemo() : authService.loginWithGithub()} disabled={busy}>{busy ? 'Connecting…' : USE_MOCK ? 'Connect demo account' : 'Connect with GitHub'}</button><Link className="btn-s" to="/login">Sign-in options</Link></div>} /> }
export const Code = ({ children }: { children: string }) => <pre className="overflow-x-auto rounded-xl bg-inset border border-line p-3 font-mono text-xs leading-relaxed">{children}</pre>
export const Skeleton = ({ h = 'h-24' }: { h?: string }) => <div className={cn('skeleton', h)} aria-hidden />
export function Modal({ open, title, text, confirm, onClose, onOk }: { open: boolean; title: string; text: string; confirm: string; onClose(): void; onOk(): void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); if (open) window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open, onClose])
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-sm p-5" initial={{ y: 12 }} animate={{ y: 0 }} onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-ink2">{text}</p>
      <div className="mt-5 flex justify-end gap-2"><button className="btn-s" onClick={onClose} autoFocus>Cancel</button><button className="btn bg-err text-white" onClick={() => { onOk(); onClose() }}>{confirm}</button></div></motion.div></motion.div>}</AnimatePresence>
}
export function Toasts() {
  const { toasts, dismiss } = useApp()
  return <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
    <AnimatePresence>{toasts.map(t => <motion.div key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="card flex items-start gap-2 p-3 text-sm">
      {t.tone === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 text-ok" /> : t.tone === 'err' ? <AlertCircle size={16} className="mt-0.5 text-err" /> : <Info size={16} className="mt-0.5 text-teal" />}
      <span className="flex-1">{t.msg}</span><button aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={14} /></button></motion.div>)}</AnimatePresence></div>
}
export const Meta = ({ k, v }: { k: string; v: ReactNode }) => <div><div className="text-xs text-mute">{k}</div><div className="text-sm font-medium">{v}</div></div>
export { fmt }
