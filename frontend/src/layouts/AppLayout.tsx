import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Dna,
  GitBranch,
  Network,
  Activity,
  Search,
  FileSearch,
  Target,
  Route,
  FileText,
  Settings,
  Bell,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Command,
  CircleHelp,
  LogOut,
} from 'lucide-react'

import { cn } from '../utils'
import { useApp } from '../context/AppContext'
import { Toasts, DemoTag } from '../components/ui'
import { USE_MOCK } from '../api/client'

const NAV = [
  {
    group: 'WORKSPACE',
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/career-dna', label: 'Career DNA', icon: Dna },
    ],
  },
  {
    group: 'DEVELOPER ACTIVITY',
    items: [
      { to: '/repositories', label: 'Repositories', icon: GitBranch },
      { to: '/evidence', label: 'Evidence explorer', icon: Network },
      { to: '/changes', label: 'Change activity', icon: Activity },
    ],
  },
  {
    group: 'CAREER INTELLIGENCE',
    items: [
      { to: '/job-analyzer', label: 'Job analyzer', icon: Search },
      { to: '/job-fit', label: 'Job fit reports', icon: FileSearch },
      { to: '/gaps', label: 'Skill gaps', icon: Target },
      { to: '/roadmap', label: 'Learning roadmap', icon: Route },
      { to: '/resume', label: 'Resume review', icon: FileText },
    ],
  },
]

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const { user, changes, freshness } = useApp()

  const displayName = user?.name || 'Guest'
  const initial = displayName.charAt(0).toUpperCase()
  const hasGithub = Boolean(user?.githubLogin || user?.demo)
  const hasUpdates = changes.length > 0 || freshness !== 'fresh'

  const side = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="group flex items-center gap-2.5"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#153D36] text-white">
            <ShieldCheck size={18} strokeWidth={1.8} />
          </span>

          <span className="text-[17px] font-semibold tracking-[-0.7px] text-[#172B27]">
            SkillProof
          </span>
        </Link>

        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-ink2 hover:bg-soft lg:hidden"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Workspace identity */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F0F3EE] text-sm font-semibold text-[#31574D]">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {displayName}
            </p>
            <p className="mt-0.5 text-xs text-mute">
              Developer workspace
            </p>
          </div>

          <ChevronRight size={15} className="text-mute" />
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-7 overflow-y-auto px-3 pb-5 pt-6"
      >
        {NAV.map(({ group, items }) => (
          <section key={group}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[1.25px] text-mute">
              {group}
            </p>

            <div className="space-y-1">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-[10px] text-[13px] transition-colors duration-150',
                      isActive
                        ? 'bg-[#EDF4F0] font-medium text-[#245B4D]'
                        : 'text-[#626C67] hover:bg-[#F6F7F5] hover:text-[#263C34]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#397966]" />
                      )}

                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2 : 1.7}
                      />

                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-line p-3">
        <NavLink
          to="/settings"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
              isActive
                ? 'bg-[#EDF4F0] text-[#245B4D]'
                : 'text-[#626C67] hover:bg-[#F6F7F5]'
            )
          }
        >
          <Settings size={17} strokeWidth={1.7} />
          Settings
        </NavLink>

        <a
          href="mailto:support@skillproof.dev"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-[#626C67] transition-colors hover:bg-[#F6F7F5]"
        >
          <CircleHelp size={17} strokeWidth={1.7} />
          Help & support
        </a>

        <div className="mt-3 rounded-lg bg-[#F7F8F6] p-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5A8A70]" />
            <span className="text-xs font-medium text-[#354A40]">
              SkillProof workspace
            </span>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-mute">
            Skills backed by evidence, not assumptions.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F9F7] lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line lg:block">
        {side}
      </aside>

      {/* Mobile navigation */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 h-full w-full bg-black/30"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />

          <aside className="relative h-full w-[280px] max-w-[85vw] shadow-xl">
            {side}
          </aside>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <button
          className="rounded-lg p-2 text-ink2 transition-colors hover:bg-soft lg:hidden"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="relative w-full max-w-[430px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />

          <input
            className="h-10 w-full rounded-lg border border-line bg-[#FAFBF9] pl-9 pr-16 text-[13px] text-ink outline-none transition focus:border-[#8DA99B] focus:bg-white focus:ring-2 focus:ring-[#E7EFEA]"
            placeholder="Search skills, files, commits..."
            aria-label="Search skills, files and commits"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-line bg-white px-1.5 py-1 text-[10px] text-mute">
            <Command size={10} /> K
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {USE_MOCK && (
            <span className="hidden sm:block">
              <DemoTag>Demo data</DemoTag>
            </span>
          )}

          {/* GitHub connection status */}
          <div
            className={cn(
              'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex',
              hasGithub
                ? 'border-[#D7E8DD] bg-[#F3F8F4] text-[#37664B]'
                : 'border-line bg-white text-ink2'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                hasGithub ? 'bg-[#57916C]' : 'bg-[#A6AAA5]'
              )}
            />
            {user?.githubLogin
              ? user.githubLogin
              : user?.demo
                ? 'Demo connected'
                : 'GitHub not connected'}
          </div>

          {/* Notifications */}
          <Link
            to="/changes"
            aria-label={`Notifications: ${changes.length} change events`}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-ink2 transition-colors hover:bg-soft hover:text-ink"
          >
            <Bell size={18} strokeWidth={1.7} />

            {hasUpdates && (
              <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-[#C68A43]" />
            )}
          </Link>

          {/* Account */}
          <Link
            to="/settings"
            aria-label={`Account settings for ${displayName}`}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#DDE9E1] text-sm font-semibold text-[#31574D] ring-1 ring-[#D0DED4] transition hover:ring-[#7D9C89]"
          >
            {initial}
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto min-h-[calc(100vh-68px)] max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <Outlet context={{ q }} />
      </main>

      <Toasts />
    </div>
  )
}