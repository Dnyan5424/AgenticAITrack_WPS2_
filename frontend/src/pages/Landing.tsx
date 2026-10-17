
import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  FileCode2,
  FileSearch,
  GitBranch,
  GitCommitHorizontal,
  Github,
  RefreshCw,
  GraduationCap,
  LogOut,
  Menu,
  MessageCircle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { cn } from '../utils'

const requirements = [
  { name: 'REST API design', status: 'verified' },
  { name: 'SQL queries', status: 'missing' },
  { name: 'Automated tests', status: 'missing' },
  { name: 'Deployment', status: 'partial' },
] as const

const floatAnimation = (reduced: boolean, delay: number) =>
  reduced
    ? {}
    : {
        y: [0, -5, 0],
        transition: {
          duration: 5 + delay,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay,
        },
      }

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-teal">
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      {children}
    </div>
  )
}

function SectionNumber({ children }: { children: string }) {
  return (
    <span className="font-mono text-xs tracking-widest text-amber-700">
      {children}
    </span>
  )
}

function Landing() {
  const reducedMotion = !!useReducedMotion()
  const navigate = useNavigate()
  const { connectDemo, repo, job, skills, changes, user, signOut, push } = useApp()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const demoSkills = skills.filter((skill) =>
    ['API development', 'SQL', 'Automated testing', 'Docker'].includes(
      skill.name,
    ),
  )

  const latestChange = changes[0]

  const startDemo = async () => {
    if (user) {
      navigate('/dashboard')
      return
    }
    if (connecting) return

    setConnecting(true)
    try {
      await connectDemo()
      navigate('/dashboard')
    } finally {
      setConnecting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      push((error as Error).message, 'err')
    }
  }

  const reveal = (delay = 0) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.65, delay, ease: 'easeOut' as const },
        }

  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      {/* Navigation */}
      <header className="relative z-30 border-b border-[#e9e3d9]">
        <nav className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f38] text-[#f8f5ed] transition-transform group-hover:-rotate-3">
              <ShieldCheck size={22} strokeWidth={1.7} />
            </span>
            <span>
              <span className="block font-display text-xl font-bold tracking-tight text-[#202b28]">
                SkillProof<span className="text-teal">.</span>
              </span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.17em] text-[#85877e] sm:block">
                Skills, with receipts.
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a className="landing-nav-link" href="#how-it-works">
              How it works
            </a>
            <a className="landing-nav-link" href="#evidence">
              Evidence engine
            </a>
            <a className="landing-nav-link" href="#who-its-for">
              Who it's for
            </a>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <>
                <Link className="landing-signin inline-flex items-center gap-2" to="/settings" aria-label={`Profile for ${user.name}`}>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7eee8] text-xs font-semibold text-[#245b4d]">{user.name.charAt(0).toUpperCase()}</span>
                  <UserRound size={15} />
                  Profile
                </Link>
                <button className="landing-signin inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent" type="button" onClick={() => void handleSignOut()}>
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <Link className="landing-signin" to="/login">Sign in</Link>
            )}
            <button
              className="landing-button landing-button-dark"
              onClick={startDemo}
              disabled={connecting}
            >
              {connecting ? 'Connecting…' : user ? 'Open dashboard' : 'Explore SkillProof'}
              <ArrowUpRight size={16} />
            </button>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6e0d6] md:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>

        {mobileMenu && (
          <div className="absolute left-0 right-0 top-full border-b border-[#e6e0d6] bg-[#fbf9f4] p-5 shadow-lg md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#how-it-works" onClick={() => setMobileMenu(false)}>
                How it works
              </a>
              <a href="#evidence" onClick={() => setMobileMenu(false)}>
                Evidence engine
              </a>
              <a href="#who-its-for" onClick={() => setMobileMenu(false)}>
                Who it's for
              </a>
              {user ? (
                <>
                  <Link className="flex items-center gap-2" to="/settings" onClick={() => setMobileMenu(false)}>
                    <UserRound size={16} />
                    Profile · {user.name}
                  </Link>
                  <button className="flex items-center gap-2 text-left" type="button" onClick={() => { setMobileMenu(false); void handleSignOut() }}>
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenu(false)}>Sign in</Link>
              )}
              <button
                className="landing-button landing-button-dark justify-center"
                onClick={startDemo}
                disabled={connecting}
              >
                {user ? 'Open dashboard' : connecting ? 'Connecting…' : 'Explore SkillProof'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="landing-grid-bg relative">
        <div className="mx-auto grid max-w-[1320px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-24">
          <motion.div {...reveal()}>
            <Eyebrow>Career intelligence / 01</Eyebrow>

            <h1 className="max-w-[680px] font-display text-[clamp(3.3rem,7vw,6.5rem)] font-semibold leading-[0.98] tracking-[-0.075em] text-[#202b28]">
              Your skills
              <br />
              deserve
              <br />
              <span className="landing-headline-accent">better proof.</span>
            </h1>

            <p className="mt-7 max-w-lg text-[16px] leading-8 text-[#666b63] sm:text-lg">
              Connect the work you've built with the jobs you want. SkillProof
              examines project evidence, surfaces skill gaps, and tracks what
              changes as your code evolves.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="landing-button landing-button-dark min-h-12"
                onClick={startDemo}
                disabled={connecting}
              >
                <Github size={17} />
                {connecting ? 'Opening demo…' : 'Explore with sample data'}
                <ArrowRight size={16} />
              </button>

              <Link
                className="landing-button landing-button-light min-h-12"
                to="/job-analyzer"
              >
                Analyze a job
                <ArrowUpRight size={16} />
              </Link>
              <Link
                className="landing-button landing-button-light min-h-12"
                to="/ai-roadmap"
              >
                <Sparkles size={16} />
                Build a learning roadmap
              </Link>
              <Link
                className="landing-button landing-button-light min-h-12"
                to="/ai-mentor"
              >
                <MessageCircle size={16} />
                Ask AI Mentor
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#e7e1d6] pt-6">
              <div className="flex items-center gap-2 text-xs text-[#62685f]">
                <FileSearch size={15} className="text-teal" />
                Traceable evidence
              </div>
              <div className="flex items-center gap-2 text-xs text-[#62685f]">
                <GitBranch size={15} className="text-teal" />
                Change-aware analysis
              </div>
            </div>
          </motion.div>

          {/* Bespoke evidence workspace */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative mx-auto w-full max-w-[650px]"
          >
            <div className="absolute -right-5 -top-8 h-36 w-36 rounded-full bg-[#e6e8d8] blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[#f4e5c9] blur-3xl" />

            <div className="relative overflow-hidden rounded-[19px] border border-[#dcd7cb] bg-[#fffefa] shadow-[0_24px_80px_-35px_rgba(43,53,44,0.28)]">
              <div className="flex items-center justify-between border-b border-[#eae5db] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#5d9b7b]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#73776e]">
                    Skill assessment / Preview
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#92948b]">
                  SP—001
                </span>
              </div>

              <div className="grid gap-0 sm:grid-cols-[1fr_0.85fr]">
                <div className="border-b border-[#eae5db] p-5 sm:border-b-0 sm:border-r">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#81857b]">
                        Analyzing repository
                      </p>
                      <h2 className="mt-2 break-words font-display text-xl font-semibold tracking-tight text-[#29332e]">
                        {repo?.name || 'campus-orders-api'}
                      </h2>
                      <p className="mt-1 text-xs text-[#82857c]">
                        {repo?.language || 'Python'} · main branch
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#e8f1e8] p-2 text-[#286b53]">
                      <Code2 size={20} />
                    </div>
                  </div>

                  <div className="mt-7">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#3d4941]">
                        Evidence found
                      </span>
                      <span className="font-mono text-[10px] text-[#82857c]">
                        FILE INDEX
                      </span>
                    </div>

                    {[
                      {
                        path: 'app/routes/orders.py',
                        kind: 'API',
                        color: 'text-[#34735b]',
                      },
                      {
                        path: 'tests/test_orders.py',
                        kind: 'TEST',
                        color: 'text-[#94641d]',
                      },
                      {
                        path: 'db/queries.sql',
                        kind: 'SQL',
                        color: 'text-[#536e9a]',
                      },
                    ].map((file, i) => (
                      <motion.div
                        key={file.path}
                        initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.16 }}
                        className="mb-2 flex items-center gap-2 rounded-lg border border-[#eeebe3] bg-[#fdfcf8] px-3 py-3"
                      >
                        <FileCode2 size={15} className="shrink-0 text-[#92948b]" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#515b52]">
                          {file.path}
                        </span>
                        <span className={cn('font-mono text-[9px]', file.color)}>
                          {file.kind}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-[#eae5db] pt-4">
                    <Github size={14} className="text-[#656b62]" />
                    <span className="truncate font-mono text-[10px] text-[#777b72]">
                      {repo?.latestSha || 'c41d9e7'} · repository snapshot
                    </span>
                  </div>
                </div>

                <div className="bg-[#faf8f2] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#81857b]">
                    Role requirements
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-[#29332e]">
                    {job?.title || 'Backend Intern'}
                  </h3>
                  <p className="mt-1 text-xs text-[#82857c]">
                    {job?.company || 'Example company'}
                  </p>

                  <div className="mt-6 space-y-4">
                    {requirements.map((requirement, index) => {
                      const matched = demoSkills.find((skill) =>
                        skill.name.toLowerCase().includes(
                          requirement.name.toLowerCase().split(' ')[0],
                        ),
                      )

                      const status = matched?.status
                        ? matched.status
                        : requirement.status

                      const demonstrated =
  status === 'demonstrated' || status === 'verified';

const partial = status === 'partial';
                      return (
                        <motion.div
                          key={requirement.name}
                          {...reveal(index * 0.08)}
                          className="flex items-start gap-2"
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                              demonstrated
                                ? 'bg-[#dcece0] text-[#286b53]'
                                : partial
                                  ? 'bg-[#f4e7c9] text-[#94641d]'
                                  : 'bg-[#efe9df] text-[#8b8173]',
                            )}
                          >
                            {demonstrated ? (
                              <Check size={10} />
                            ) : partial ? (
                              <CircleDot size={10} />
                            ) : (
                              <span className="text-[9px]">—</span>
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#404b42]">
                              {requirement.name}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-[#898b81]">
                              {demonstrated
                                ? 'Evidence identified'
                                : partial
                                  ? 'Some evidence found'
                                  : 'Needs evidence review'}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <Link
                    to="/job-analyzer"
                    className="mt-7 flex w-full items-center justify-between border-t border-[#e5dfd4] pt-4 text-xs font-semibold text-[#286b53] hover:text-[#173f38]"
                  >
                    Inspect assessment
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eae5db] bg-white px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#b77a24]" />
                  <span className="text-[10px] text-[#62685f]">
                    Evidence-linked assessment
                  </span>
                </div>
                <span className="font-mono text-[9px] text-[#92948b]">
                  DEMO DATA
                </span>
              </div>
            </div>

            <motion.div
              animate={floatAnimation(reducedMotion, 1)}
              className="absolute -bottom-8 -left-2 hidden max-w-[260px] rounded-xl border border-[#dfd9cc] bg-[#fffefa] p-4 shadow-lg sm:block lg:-left-8"
            >
              <div className="flex items-center gap-2">
                <GitCommitHorizontal size={16} className="text-teal" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#7b8075]">
                  Change detected
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-[#37433b]">
                {latestChange?.message || 'New commit changes the evidence'}
              </p>
              <p className="mt-1 text-[10px] text-[#81857b]">
                Reassess affected skills only
              </p>
            </motion.div>

            <div className="absolute -right-2 top-12 hidden rounded-lg border border-[#dfd9cc] bg-[#fffefa] px-3 py-2 shadow-md sm:block lg:-right-5">
              <div className="flex items-center gap-2">
                <CheckCheck size={14} className="text-teal" />
                <span className="font-mono text-[10px] text-[#47564b]">
                  TRACEABLE
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Product philosophy */}
      <section id="evidence" className="border-y border-[#e6e0d5] bg-[#f2efe6]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1fr_1fr] md:items-center lg:px-12">
          <div>
            <Eyebrow>The principle / 02</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.045em] text-[#27332c] sm:text-4xl">
              A claim is a start.
              <br />
              <span className="text-teal">Evidence is the point.</span>
            </h2>
          </div>

          <div className="border-l-2 border-[#d8a24b] pl-5">
            <p className="text-sm leading-7 text-[#676b62]">
              A missing file doesn't mean a missing skill. SkillProof helps
              distinguish what a repository demonstrates, what it partially
              demonstrates, and what couldn't be verified in the analyzed
              scope.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b7858]">
              No invented proof. No false certainty.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <motion.div {...reveal()} className="max-w-2xl">
          <Eyebrow>From code to clarity / 03</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#202b28] sm:text-5xl">
            Four steps.
            <br />
            A clearer picture of your skills.
          </h2>
          <p className="mt-5 max-w-lg leading-7 text-[#70746a]">
            Turn existing project work into a more useful view of your
            readiness for a specific role.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#e6e0d5] sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              number: '01',
              icon: Github,
              title: 'Connect your work',
              text: 'Start with a repository and the project evidence available to analyze.',
              detail: 'SOURCE MATERIAL',
            },
            {
              number: '02',
              icon: ScanSearch,
              title: 'Read the role',
              text: 'Break a job description into concrete required and preferred skills.',
              detail: 'JOB REQUIREMENTS',
            },
            {
              number: '03',
              icon: FileSearch,
              title: 'Trace the evidence',
              text: 'Connect relevant skills to files, commits, and supporting material.',
              detail: 'SKILL ASSESSMENT',
            },
            {
              number: '04',
              icon: RefreshCw,
              title: 'Update with change',
              text: 'Reassess affected skills when new work changes the available evidence.',
              detail: 'CONTINUOUS REVIEW',
            },
          ].map((item, index) => {
            const Icon = item.icon

            return (
              <motion.article
                key={item.number}
                {...reveal(index * 0.08)}
                className="group flex min-h-[260px] flex-col bg-[#fbf9f4] p-6 transition-colors hover:bg-white sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <SectionNumber>{item.number}</SectionNumber>
                  <Icon
                    size={21}
                    strokeWidth={1.6}
                    className="text-teal transition-transform group-hover:-translate-y-1"
                  />
                </div>

                <h3 className="mt-8 font-display text-xl font-semibold tracking-tight text-[#27332c]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#73766c]">
                  {item.text}
                </p>
                <div className="mt-auto pt-6 font-mono text-[9px] tracking-[0.14em] text-[#9a988b]">
                  {item.detail}
                </div>
              </motion.article>
            )
          })}
        </div>
      </section>

      {/* Change-aware assessment */}
      <section className="bg-[#173f38] text-[#f8f5ed]">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-12 lg:py-24">
          <motion.div {...reveal()}>
            <Eyebrow>Built for evolving work / 04</Eyebrow>

            <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-5xl">
              Your code changes.
              <br />
              Your assessment
              <br />
              should, too.
            </h2>

            <p className="mt-6 max-w-lg leading-7 text-[#d0ddd5]">
              A new commit shouldn't force every skill to be reassessed. The
              intended workflow identifies changed files, maps them to
              potentially affected skills, and updates the relevant results.
            </p>

            <div className="mt-8">
              <Link
                to="/activity"
                className="inline-flex items-center gap-2 border-b border-[#92c3ac] pb-2 text-sm font-medium text-[#dff2e6] transition-colors hover:text-white"
              >
                Explore change activity
                <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>

          <motion.div {...reveal(0.12)}>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-[#214a42]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#bed4c8]">
                  Change review
                </span>
                <span className="flex items-center gap-2 font-mono text-[9px] text-[#b4d9bf]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#a3d3b3]" />
                  WORKFLOW PREVIEW
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/10 p-2">
                    <GitCommitHorizontal size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {latestChange?.message || 'Add SQL queries and API tests'}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[#b4c9bd]">
                      {latestChange?.files?.join(', ') ||
                        'db/queries.sql · tests/test_api.py'}
                    </p>
                  </div>
                </div>

                <div className="ml-4 mt-5 border-l border-white/20 pl-6">
                  {[
                    ['Change detected', 'Compare repository snapshots'],
                    ['Affected skills identified', 'Review only relevant assessments'],
                    ['Evidence reassessed', 'Preserve unrelated results'],
                  ].map(([title, description], index) => (
                    <div key={title} className="relative pb-6 last:pb-0">
                      <span
                        className={cn(
                          'absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full',
                          index === 2
                            ? 'bg-[#d7e9d7] text-[#245a46]'
                            : 'bg-white/15 text-[#e1eee4]',
                        )}
                      >
                        {index === 2 ? (
                          <Check size={12} />
                        ) : (
                          <span className="font-mono text-[9px]">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#b4c9bd]">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-[#bed4c8]">
                  <Clock3 size={13} />
                  Previous assessments remain unchanged unless affected
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who it's for */}
      <section
        id="who-its-for"
        className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Eyebrow>Designed around real needs / 05</Eyebrow>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.055em] text-[#202b28] sm:text-5xl">
              Built for people
              <br />
              building their future.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#70746a]">
            Start with the developer. Give educators and hiring teams a clearer
            way to review the work behind a skill claim.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="relative overflow-hidden rounded-2xl border border-[#e4ded2] bg-[#f1eee5] p-7 sm:p-9">
            <div className="absolute -right-7 -top-7 h-36 w-36 rounded-full border border-[#d9d5c9]" />
            <div className="absolute -right-1 top-0 h-24 w-24 rounded-full border border-[#d9d5c9]" />

            <GraduationCap size={25} strokeWidth={1.6} className="text-teal" />
            <h3 className="mt-7 font-display text-2xl font-semibold tracking-tight text-[#29352e]">
              For students & developers
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#6e7268]">
              Understand what your portfolio demonstrates, discover evidence
              gaps against a target role, and choose meaningful next projects.
            </p>

            <Link
              to="/dashboard"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:gap-3"
            >
              Explore your workspace
              <ChevronRight size={16} />
            </Link>
          </article>

          <article className="relative overflow-hidden rounded-2xl border border-[#e4ded2] bg-[#fffefa] p-7 sm:p-9">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#e8efe5]" />

            <Users size={25} strokeWidth={1.6} className="relative text-teal" />
            <h3 className="relative mt-7 font-display text-2xl font-semibold tracking-tight text-[#29352e]">
              For placement teams
            </h3>
            <p className="relative mt-3 max-w-md text-sm leading-7 text-[#6e7268]">
              Review skill assessments with traceable supporting evidence and
              help candidates understand where their portfolios need work.
            </p>

            <Link
              to="/job-analyzer"
              className="relative mt-7 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:gap-3"
            >
              Explore job analysis
              <ChevronRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-20">
        <div className="landing-cta-grid mx-auto max-w-[1320px] overflow-hidden rounded-2xl border border-[#dcd7cb] bg-[#f0eee5] px-6 py-12 sm:px-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Make your next move count / 06</Eyebrow>
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.06em] text-[#202b28] sm:text-5xl">
              Show the work.
              <br />
              Understand the gaps.
              <br />
              <span className="text-teal">Build the proof.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#6e7268]">
              Start with a sample workspace and explore how job requirements
              connect to project evidence.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                className="landing-button landing-button-dark min-h-12"
                onClick={startDemo}
                disabled={connecting}
              >
                Explore SkillProof
                <ArrowRight size={16} />
              </button>
              <Link
                className="landing-button landing-button-light min-h-12"
                to="/job-analyzer"
              >
                Analyze a job
                <ArrowUpRight size={16} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6e0d5]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-teal" />
            <span className="font-display font-bold text-[#29352e]">
              SkillProof<span className="text-teal">.</span>
            </span>
          </Link>

          <p className="max-w-md text-xs leading-5 text-[#85877e]">
            Evidence-linked skill insights, not a guarantee of competence or a
            prediction of hiring outcomes.
          </p>

          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#85877e]">
            Built around evidence.
          </span>
        </div>
      </footer>
    </main>
  )
}

export default Landing
