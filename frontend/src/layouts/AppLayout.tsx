import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, Dna, GitBranch, Network, Activity, Search, FileSearch, Target, ListChecks, Route, FileText, Settings, Bell, Menu, X, ShieldCheck } from 'lucide-react'
import { cn } from '../utils'
import { useApp } from '../context/AppContext'
import { Toasts, DemoTag } from '../components/ui'
import { USE_MOCK } from '../api/client'
const NAV = [['Overview', [['/dashboard', 'Dashboard', LayoutDashboard], ['/career-dna', 'Career DNA', Dna]]], ['Developer Proof', [['/repositories', 'Repositories', GitBranch], ['/evidence', 'Evidence Explorer', Network], ['/changes', 'Change Activity', Activity]]],
  ['Career Growth', [['/job-analyzer', 'Job Analyzer', Search], ['/job-fit', 'Job Fit Reports', FileSearch], ['/gaps', 'Gap Report', Target], ['/roadmap', 'Learning Roadmap', Route], ['/resume', 'Resume Reality Check', FileText]]], ['Account', [['/settings', 'Settings', Settings]]]] as const
export default function AppLayout() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const { user, changes, freshness } = useApp()
  const side = <nav aria-label="Main" className="flex h-full flex-col gap-5 overflow-y-auto p-4">
    <Link to="/" className="flex items-center gap-2 px-2 font-head text-lg font-semibold"><ShieldCheck className="text-teal" />SkillProof</Link>
    {NAV.map(([g, items]) => <div key={g}><div className="px-2 pb-1 text-xs font-medium text-mute">{g}</div>{items.map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition', isActive ? 'bg-teal-light font-medium text-teal' : 'text-ink2 hover:bg-soft')}><Icon size={16} />{label}</NavLink>)}</div>)}</nav>
  return <div className="min-h-screen lg:pl-64">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">{side}</aside>
    {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} /><aside className="relative h-full w-64 bg-white">{side}<button className="absolute right-3 top-4" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button></aside></div>}
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-cream/90 px-4 py-3 backdrop-blur">
      <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
      <label className="relative max-w-sm flex-1"><span className="sr-only">Search</span><Search size={15} className="absolute left-3 top-3 text-mute" /><input className="input pl-9" placeholder="Search skills, files, commits" value={q} onChange={e => setQ(e.target.value)} /></label>
      <div className="ml-auto flex items-center gap-3">
        {USE_MOCK && <span className="hidden sm:block"><DemoTag>Mock mode</DemoTag></span>}
        <span className={cn('hidden rounded-full border px-2.5 py-0.5 text-xs md:block', user ? 'border-green-200 bg-green-50 text-ok' : 'border-line bg-white text-ink2')}>{user ? `GitHub: ${user.demo ? 'demo connected' : 'connected'}` : 'GitHub: not connected'}</span>
        <Link to="/changes" aria-label={`Notifications: ${changes.length} change events`} className="relative rounded-xl p-2 hover:bg-soft"><Bell size={18} />{(changes.length > 0 || freshness !== 'fresh') && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber" />}</Link>
        <Link to="/settings" aria-label="User menu" className="grid h-9 w-9 place-items-center rounded-full bg-teal text-sm font-semibold text-white">{(user?.name || 'Guest')[0]}</Link></div>
    </header>
    <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet context={{ q }} /></main><Toasts />
  </div>
}
