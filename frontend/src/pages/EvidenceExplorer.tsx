import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Badge, PageHead, NeedConnect, Empty, Code, Meta } from '../components/ui'
import type { EvidenceGraphEdge, EvidenceGraphNode } from '../types'
const COLS = ['Job requirement', 'Skill', 'Repository', 'File', 'Commit']
export default function EvidenceExplorer() {
  const { skills, job, user } = useApp(); const [q, setQ] = useState(''); const [skill, setSkill] = useState('API development'); const [node, setNode] = useState('skill')
  if (!user) return <><PageHead title="Evidence Explorer" /><NeedConnect /></>
  const s = skills.find(x => x.name === skill) || skills[0]; if (!s) return <Empty title="No skills" text="Run an analysis first." />
  const req = job?.requirements.find(r => r.name === s.name)
  const nodes: EvidenceGraphNode[] = [{ id: 'job', type: 'job', label: req ? (req.required ? 'Required' : 'Preferred') : 'Not in job', col: 0 }, { id: 'skill', type: 'skill', label: s.name, col: 1 }]
  const edges: EvidenceGraphEdge[] = [{ from: 'job', to: 'skill' }]
  s.evidence.forEach((e, i) => { const r = 'repo' + i, f = 'file' + i, c = 'commit' + i; nodes.push({ id: r, type: 'repo', label: e.repo, col: 2 }, { id: f, type: 'file', label: e.file.split('/').pop()!, col: 3 }, { id: c, type: 'commit', label: e.commit, col: 4 }); edges.push({ from: 'skill', to: r }, { from: r, to: f }, { from: f, to: c }) })
  const pos = (n: EvidenceGraphNode) => { const same = nodes.filter(x => x.col === n.col); return { x: 60 + n.col * 150, y: 60 + same.indexOf(n) * 70 + (n.col < 2 ? 40 : 0) } }
  const P = (id: string) => pos(nodes.find(n => n.id === id)!)
  const selNode = nodes.find(n => n.id === node) || nodes[1]; const idx = parseInt(selNode.id.replace(/\D/g, '') || '0'); const ev = s.evidence[idx] || s.evidence[0]
  return <><PageHead title="Evidence Explorer" sub="Follow a requirement through skill, repository, file and commit. Select any node for details." />
    <div className="grid gap-5 lg:grid-cols-[220px_1fr_280px]">
      <div className="card p-3 sm:p-4"><input aria-label="Search skills" className="input mb-3" placeholder="Search skills" value={q} onChange={e => setQ(e.target.value)} /><ul className="quiet-scrollbar max-h-[32rem] space-y-1 overflow-y-auto pr-1">{skills.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).map(x => <li key={x.name}><button onClick={() => { setSkill(x.name); setNode('skill') }} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm leading-5 transition-colors hover:bg-soft ${x.name === s.name ? 'bg-teal-light font-medium text-teal' : ''}`}><div className="font-medium">{x.name}</div><div className="mt-0.5 text-xs text-ink2">{x.evidence.length} evidence · {x.status.replace('_', ' ')}</div></button></li>)}</ul></div>
      <div className="card overflow-x-auto p-4 sm:p-5"><svg viewBox="0 0 800 300" className="min-w-[640px]" role="img" aria-label={`Evidence graph for ${s.name}`}>
        {COLS.map((c, i) => <text key={c} x={60 + i * 150} y="22" textAnchor="middle" className="fill-mute text-[11px]">{c}</text>)}
        {edges.map((e, i) => { const a = P(e.from), b = P(e.to); return <motion.path key={skill + i} d={`M${a.x + 45} ${a.y} C ${a.x + 100} ${a.y}, ${b.x - 100} ${b.y}, ${b.x - 45} ${b.y}`} stroke="#D97706" strokeWidth="1.5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * .12 }} /> })}
        {nodes.map(n => { const p = pos(n); return <g key={skill + n.id} tabIndex={0} role="button" aria-label={`${n.type}: ${n.label}`} className="cursor-pointer" onClick={() => setNode(n.id)} onKeyDown={e => e.key === 'Enter' && setNode(n.id)}><rect x={p.x - 45} y={p.y - 18} width="90" height="36" rx="10" fill={node === n.id ? '#E5F4F1' : '#fff'} stroke={node === n.id ? '#0F766E' : '#E3DFD5'} /><text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-ink text-[10px]">{n.label.length > 13 ? n.label.slice(0, 12) + '…' : n.label}</text></g> })}</svg>
        {!s.evidence.length && <p className="p-3 text-sm text-ink2">No evidence found for {s.name} in the analyzed scope.</p>}</div>
      <div className="card space-y-4 p-5" aria-live="polite"><h2 className="font-display text-lg font-semibold tracking-tight">{s.name}</h2><Badge s={s.status} /><Meta k="Confidence" v={Math.round(s.confidence * 100) + '%'} />
        {ev ? <><Meta k="Repository" v={ev.repo} /><Meta k="File path" v={<span className="font-mono text-xs">{ev.file}</span>} /><Code>{ev.excerpt}</Code><Meta k="Commit" v={<span className="font-mono">{ev.commit}</span>} /><p className="text-sm text-ink2">{ev.explanation}</p><p className="text-xs text-mute">{ev.url ? <a className="text-teal underline" href={ev.url} target="_blank" rel="noreferrer">Open on GitHub</a> : 'No GitHub link available.'}</p></> : <p className="text-sm text-ink2">{s.gap}</p>}</div></div></>
}
