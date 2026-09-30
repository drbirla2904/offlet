import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { conversationsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage } from '../utils/apiError'

interface ConversationSummary {
  id: number
  business_name: string
  participant_name: string
  participant_phone: string
  participant_role: 'customer' | 'shopkeeper' | 'admin'
  last_message: { text: string; created_at: string } | null
  unread_count: number
}

interface ChatMessage {
  id: number
  sender: number
  text: string
  created_at: string
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function MessagesListPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const result = await conversationsApi.list()
      setError('')
      setConversations(result.results || result)
    } catch (err) {
      setError(apiErrorMessage(err, 'Your messages could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    conversationsApi.list()
      .then((result) => {
        if (!active) return
        setError('')
        setConversations(result.results || result)
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, 'Your messages could not be loaded.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-28 sm:pb-12">
      <div className="mb-6 border-b border-border pb-5">
        <p className="text-xs font-semibold text-teal uppercase mb-1">Inbox</p>
        <h1 className="font-display text-3xl font-semibold text-ink">Messages</h1>
        <p className="text-sm text-ink-soft mt-1">Keep your shop conversations in one place.</p>
      </div>
      {loading ? (
        <div className="space-y-4" aria-label="Loading messages">
          {[0, 1, 2].map((item) => <div key={item} className="flex gap-3 py-2"><span className="skeleton w-11 h-11 rounded-full" /><span className="flex-1 space-y-2"><span className="skeleton block h-4 w-1/3 rounded" /><span className="skeleton block h-3 w-2/3 rounded" /></span></div>)}
        </div>
      ) : error ? (
        <div role="alert" className="py-8 text-center">
          <p className="text-sm text-ink-soft">{error}</p>
          <button onClick={() => void load()} className="mt-3 text-sm font-semibold text-marigold">Try again</button>
        </div>
      ) : conversations.length ? (
        <div className="divide-y divide-border">
          {conversations.map((conversation) => {
            const isShopkeeperInbox = conversation.participant_role === 'customer'
            const displayName = isShopkeeperInbox ? conversation.participant_name : conversation.business_name
            const contactLine = isShopkeeperInbox
              ? `Customer · ${conversation.participant_phone} · ${conversation.business_name}`
              : `${conversation.participant_name} · ${conversation.participant_phone}`
            return (
            <Link key={conversation.id} to={`/account/messages/${conversation.id}`} className="flex items-center gap-3 py-4 px-2 -mx-2 rounded-xl hover:bg-surface focus-visible:bg-surface transition-colors">
              <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full bg-teal-soft text-teal font-semibold flex items-center justify-center">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-ink">{displayName}</span>
                  {conversation.last_message && <time className="shrink-0 text-[11px] text-ink-soft">{messageTime(conversation.last_message.created_at)}</time>}
                </span>
                <span className="mt-0.5 block truncate text-xs text-teal">{contactLine}</span>
                <span className="mt-0.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-ink-soft">{conversation.last_message?.text || 'Start the conversation'}</span>
                  {conversation.unread_count > 0 && <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-marigold text-white text-[11px] font-semibold flex items-center justify-center">{conversation.unread_count}</span>}
                </span>
              </span>
            </Link>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="font-display text-xl font-semibold text-ink">No conversations yet</p>
          <p className="text-sm text-ink-soft mt-1">Message a shop from an offer or its profile.</p>
          <Link to="/search" className="inline-block mt-4 text-sm font-semibold text-marigold">Explore shops and offers</Link>
        </div>
      )}
    </div>
  )
}

export function MessageThreadPage() {
  const { id } = useParams()
  const conversationId = Number(id)
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversation, setConversation] = useState<ConversationSummary | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const result = await conversationsApi.messages(conversationId)
      setMessages(result)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Messages could not be refreshed. Check your connection and try again.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    conversationsApi.list().then((result) => {
      const conversations: ConversationSummary[] = result.results || result
      const current = conversations.find((conversation) => conversation.id === conversationId)
      if (current) setConversation(current)
    }).catch(() => {})
    const intervalId = setInterval(() => { void load(true) }, 5000)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError('')
    try {
      const sent = await conversationsApi.sendMessage(conversationId, message)
      setMessages((current) => [...current, sent])
      setText('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Message could not be sent. Your draft is still here.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-28 sm:pb-12">
      <Link to="/account/messages" className="text-sm font-medium text-teal hover:underline">← All messages</Link>
      <header className="mt-4 mb-4 border-b border-border pb-4">
        <p className="text-xs font-semibold text-teal uppercase mb-1">
          {conversation?.participant_role === 'customer' ? 'Customer conversation' : 'Shop conversation'}
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {conversation?.participant_role === 'customer' ? conversation.participant_name : conversation?.business_name || 'Shop conversation'}
        </h1>
        {conversation && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
            <span>
              {conversation.participant_role === 'customer'
                ? `Customer · ${conversation.business_name}`
                : `Shopkeeper · ${conversation.participant_name}`}
            </span>
            <span aria-hidden="true">·</span>
            <a href={`tel:${conversation.participant_phone}`} className="font-medium text-teal hover:underline">
              {conversation.participant_phone}
            </a>
          </p>
        )}
      </header>
      <section aria-label="Conversation messages" aria-live="polite" className="bg-surface border border-border rounded-2xl px-3 py-4 sm:px-5 min-h-72 max-h-[min(62vh,640px)] overflow-y-auto flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-ink-soft m-auto">Loading conversation…</p>
        ) : messages.map((message) => {
          const mine = message.sender === user?.id
          return (
            <div key={message.id} className={`max-w-[85%] sm:max-w-[72%] ${mine ? 'self-end' : 'self-start'}`}>
              <p className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${mine ? 'bg-marigold text-white rounded-br-md' : 'bg-canvas text-ink rounded-bl-md'}`}>
                {message.text}
              </p>
              <time className={`block mt-1 text-[10px] text-ink-soft ${mine ? 'text-right' : ''}`} dateTime={message.created_at}>{messageTime(message.created_at)}</time>
            </div>
          )
        })}
        {!loading && !messages.length && <p className="text-sm text-ink-soft m-auto text-center">Say hello and start the conversation.</p>}
        <div ref={bottomRef} />
      </section>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={send} className="sticky bottom-20 sm:bottom-4 mt-3 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
          rows={1}
          maxLength={2000}
          className="min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus:ring-0"
          placeholder="Write a message…"
          aria-label="Message"
        />
        <button disabled={sending || !text.trim()} className="shrink-0 rounded-xl bg-marigold px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-ink-soft">Press Enter to send · Shift + Enter for a new line</p>
    </div>
  )
}
