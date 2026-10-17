import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react'
import { aiApi, type AIMessage, type ConversationSummary } from '../api/ai'
import { USE_MOCK } from '../api/client'
import { useApp } from '../context/AppContext'
import { Empty, PageHead } from '../components/ui'

function formatInline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded bg-white/70 px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function AssistantMessage({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: JSX.Element[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let code: string[] | null = null
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(<p key={`p-${blocks.length}`} className="my-2 first:mt-0 last:mb-0">{formatInline(paragraph.join(' '))}</p>)
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    const List = list.ordered ? 'ol' : 'ul'
    blocks.push(<List key={`list-${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} my-2 space-y-1 pl-5`}>
      {list.items.map((item, index) => <li key={index}>{formatInline(item)}</li>)}
    </List>)
    list = null
  }

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      flushParagraph()
      flushList()
      if (code) {
        blocks.push(<pre key={`code-${blocks.length}`} className="my-3 overflow-x-auto rounded-lg border border-line bg-white/70 p-3 font-mono text-xs leading-relaxed"><code>{code.join('\n')}</code></pre>)
        code = null
      } else {
        code = []
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }
    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const Heading = heading[1].length === 1 ? 'h3' : 'h4'
      blocks.push(<Heading key={`heading-${blocks.length}`} className="mb-1 mt-4 first:mt-0 font-semibold">{formatInline(heading[2])}</Heading>)
      continue
    }
    const item = line.match(/^\s*(?:([-*])|(\d+)[.)])\s+(.+)$/)
    if (item) {
      flushParagraph()
      const ordered = Boolean(item[2])
      if (list && list.ordered !== ordered) flushList()
      if (!list) list = { ordered, items: [] }
      list.items.push(item[3])
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  if (code) blocks.push(<pre key={`code-${blocks.length}`} className="my-3 overflow-x-auto rounded-lg border border-line bg-white/70 p-3 font-mono text-xs leading-relaxed"><code>{code.join('\n')}</code></pre>)

  return <div className="min-w-0 break-words">{blocks}</div>
}

export default function AIMentor() {
  const { user } = useApp()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<string>()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const live = Boolean(user && !user.demo && !USE_MOCK)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    void aiApi.listConversations().then(async ({ conversations: items }) => {
      if (cancelled) return
      setConversations(items)
      if (items[0]) {
        const result = await aiApi.getConversation(items[0]._id)
        if (!cancelled) {
          setConversationId(result.conversation._id)
          setMessages(result.conversation.messages)
        }
      }
    }).catch((cause: Error) => { if (!cancelled) setError(cause.message) })
    return () => { cancelled = true }
  }, [live])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const openConversation = async (id: string) => {
    setError('')
    try {
      const result = await aiApi.getConversation(id)
      setConversationId(result.conversation._id)
      setMessages(result.conversation.messages)
    } catch (cause) { setError((cause as Error).message) }
  }

  const newConversation = () => { setConversationId(undefined); setMessages([]); setError('') }

  const removeConversation = async (id: string) => {
    try {
      await aiApi.deleteConversation(id)
      const remaining = conversations.filter(item => item._id !== id)
      setConversations(remaining)
      if (conversationId === id) {
        if (remaining[0]) await openConversation(remaining[0]._id)
        else newConversation()
      }
    } catch (cause) { setError((cause as Error).message) }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || loading) return
    setDraft(''); setError(''); setMessages(current => [...current, { role: 'user', text: message }]); setLoading(true)
    try {
      const reply = await aiApi.sendMessage({ message, conversationId })
      setConversationId(reply.conversationId)
      setMessages(current => [...current, { role: 'model', text: reply.reply }])
      const { conversations: items } = await aiApi.listConversations()
      setConversations(items)
    } catch (cause) {
      setMessages(current => current.slice(0, -1))
      setDraft(message)
      setError((cause as Error).message)
    } finally { setLoading(false) }
  }

  return <>
    <PageHead title="AI Mentor" sub="Get practical guidance grounded in your SkillProof assessments and repository evidence." />
    {!live ? <div className="card p-6"><p className="font-medium">Sign in with an authenticated account to use AI Mentor.</p><p className="mt-2 text-sm text-ink2">AI requests require an authenticated backend account.</p></div> : <div className="grid min-h-[650px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="card flex flex-col p-3">
        <button onClick={newConversation} className="btn-p w-full"><Plus size={16} />New conversation</button>
        <h2 className="px-2 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-mute">Recent conversations</h2>
        <div className="space-y-1 overflow-y-auto">
          {conversations.map(item => <div key={item._id} className={`group flex items-center rounded-lg ${conversationId === item._id ? 'bg-soft' : ''}`}>
            <button onClick={() => void openConversation(item._id)} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm hover:text-teal">{item.title}</button>
            <button onClick={() => void removeConversation(item._id)} className="p-2 text-mute opacity-0 hover:text-err group-hover:opacity-100" aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button>
          </div>)}
          {!conversations.length && <p className="px-2 py-3 text-xs text-mute">Your saved conversations will appear here.</p>}
        </div>
      </aside>
      <section className="card flex min-h-[650px] flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-soft text-teal"><Bot size={19} /></span><div><h2 className="text-sm font-semibold">SkillProof AI Mentor</h2><p className="text-xs text-mute">Uses saved skill assessments and evidence as context</p></div></header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {!messages.length ? <div className="grid min-h-[390px] place-items-center"><Empty title="What are you working toward?" text="Ask for a focused practice plan, help understanding a skill gap, or advice on your next portfolio project." /></div> : messages.map((item, index) => <div key={item._id || `${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'whitespace-pre-wrap bg-teal text-white' : 'bg-inset text-ink'}`}>{item.role === 'model' ? <AssistantMessage text={item.text} /> : item.text}</div></div>)}
          {loading && <div className="flex items-center gap-2 text-sm text-mute"><LoaderCircle size={16} className="animate-spin" />Thinking… this may take up to 2 minutes</div>}
          <div ref={bottomRef} />
        </div>
        {error && <p role="alert" className="px-5 pb-2 text-sm text-err">{error}</p>}
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3 sm:p-4"><textarea value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} rows={2} aria-label="Message the AI mentor" placeholder="Ask about your evidence, skill gaps, or next steps…" className="input min-h-[52px] resize-y" /><button className="btn-p h-[52px] shrink-0 px-4" disabled={!draft.trim() || loading} aria-label="Send message"><Send size={16} /><span className="hidden sm:inline">Send</span></button></form>
        <p className="px-4 pb-3 text-[11px] text-mute">Sending a message sends it and selected assessment snippets to Google Gemini. Repository evidence is scoped and may be incomplete; AI guidance is not an assessment by itself.</p>
      </section>
    </div>}
  </>
}
