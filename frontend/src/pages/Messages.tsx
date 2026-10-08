import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Check, CheckCheck, RefreshCw, Search } from 'lucide-react'
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
  is_blocked: boolean
}

interface ChatMessage {
  id: number
  sender: number
  text: string
  is_read: boolean
  created_at: string
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function conversationTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return messageTime(value)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${messageTime(value)}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function MessagesListPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const activeRef = useRef(false)
  const requestInFlightRef = useRef(false)

  const load = useCallback(async () => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true
    try {
      const result = await conversationsApi.list()
      if (!activeRef.current) return
      setError('')
      setConversations(result.results || result)
    } catch (err) {
      if (activeRef.current) setError(apiErrorMessage(err, 'Your messages could not be loaded.'))
    } finally {
      requestInFlightRef.current = false
      if (activeRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  useEffect(() => {
    activeRef.current = true
    void load()
    const intervalId = window.setInterval(() => { void load() }, 20000)
    return () => {
      activeRef.current = false
      window.clearInterval(intervalId)
    }
  }, [load])

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return conversations.filter((conversation) => {
      if (unreadOnly && conversation.unread_count === 0) return false
      if (!normalizedQuery) return true
      const isShopkeeperInbox = conversation.participant_role === 'customer'
      const displayName = isShopkeeperInbox ? conversation.participant_name : conversation.business_name
      return [
        displayName,
        conversation.participant_name,
        conversation.business_name,
        conversation.participant_phone,
        conversation.last_message?.text || '',
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    })
  }, [conversations, query, unreadOnly])

  const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unread_count, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-28 sm:pb-12">
      <div className="mb-6 border-b border-border pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-teal uppercase mb-1">Inbox</p>
            <h1 className="font-display text-3xl font-semibold text-ink">Messages</h1>
            <p className="text-sm text-ink-soft mt-1">Keep your shop conversations in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh conversations"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-ink-soft transition hover:bg-surface disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-4" aria-label="Loading messages">
          {[0, 1, 2].map((item) => <div key={item} className="flex gap-3 py-2"><span className="skeleton w-11 h-11 rounded-full" /><span className="flex-1 space-y-2"><span className="skeleton block h-4 w-1/3 rounded" /><span className="skeleton block h-3 w-2/3 rounded" /></span></div>)}
        </div>
      ) : (
        <>
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {conversations.length > 0 && (
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
                <Search size={17} className="shrink-0 text-ink-soft" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search people or messages"
                  aria-label="Search conversations"
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm focus:ring-0"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnreadOnly(false)}
                  aria-pressed={!unreadOnly}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!unreadOnly ? 'bg-teal text-white' : 'bg-canvas text-ink-soft hover:bg-border'}`}
                >
                  All <span className="ml-1 opacity-80">{conversations.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnreadOnly(true)}
                  aria-pressed={unreadOnly}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${unreadOnly ? 'bg-teal text-white' : 'bg-canvas text-ink-soft hover:bg-border'}`}
                >
                  Unread <span className="ml-1 opacity-80">{unreadTotal}</span>
                </button>
              </div>
            </div>
          )}
          {conversations.length && visibleConversations.length ? (
            <div className="divide-y divide-border">
              {visibleConversations.map((conversation) => {
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
                        {conversation.last_message && <time className="shrink-0 text-[11px] text-ink-soft">{conversationTime(conversation.last_message.created_at)}</time>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-teal">{contactLine}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-ink-soft">
                          {conversation.is_blocked && <Ban size={13} className="shrink-0 text-red-600" aria-label="Blocked conversation" />}
                          <span className="truncate">
                            {conversation.is_blocked ? 'Conversation blocked' : conversation.last_message?.text || 'Start the conversation'}
                          </span>
                        </span>
                        {conversation.unread_count > 0 && <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-marigold text-white text-[11px] font-semibold flex items-center justify-center">{conversation.unread_count}</span>}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : conversations.length > 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              {unreadOnly && unreadTotal === 0 ? 'You’re all caught up.' : 'No conversations match your search.'}
            </p>
          ) : (
            <div className="py-12 text-center">
              <p className="font-display text-xl font-semibold text-ink">No conversations yet</p>
              <p className="text-sm text-ink-soft mt-1">Message a shop from an offer or its profile.</p>
              <Link to="/search" className="inline-block mt-4 text-sm font-semibold text-marigold">Explore shops and offers</Link>
            </div>
          )}
        </>
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
  const activeRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const requestIdRef = useRef(0)

  const load = useCallback(async (silent = false) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true
    const requestId = ++requestIdRef.current
    try {
      const result = await conversationsApi.messages(conversationId)
      if (!activeRef.current || requestId !== requestIdRef.current) return
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]))
        for (const message of result as ChatMessage[]) byId.set(message.id, message)
        return [...byId.values()].sort((left, right) => (
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        ))
      })
      if (!silent) setError('')
    } catch (err) {
      if (activeRef.current && requestId === requestIdRef.current) {
        setError(apiErrorMessage(err, 'Messages could not be refreshed. Check your connection and try again.'))
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestInFlightRef.current = false
        if (activeRef.current && !silent) setLoading(false)
      }
    }
  }, [conversationId])

  const loadConversation = useCallback(async () => {
    try {
      const result = await conversationsApi.retrieve(conversationId)
      if (!activeRef.current) return
      setConversation(result)
    } catch (err) {
      if (activeRef.current) setError(apiErrorMessage(err, 'Conversation details could not be refreshed.'))
    }
  }, [conversationId])

  useEffect(() => {
    activeRef.current = true
    void load()
    void loadConversation()
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load(true)
        void loadConversation()
      }
    }, 5000)
    return () => {
      activeRef.current = false
      requestIdRef.current += 1
      requestInFlightRef.current = false
      window.clearInterval(intervalId)
    }
  }, [conversationId, load, loadConversation])

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

  const blockConversation = async () => {
    if (conversation?.is_blocked || sending) return
    if (!window.confirm('Block this conversation? Its message history will stay available, but no one can send new messages.')) return
    setSending(true)
    setError('')
    try {
      await conversationsApi.block(conversationId)
      setConversation((current) => current ? { ...current, is_blocked: true } : current)
    } catch (err) {
      setError(apiErrorMessage(err, 'This conversation could not be blocked. Please try again.'))
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
        {conversation && !conversation.is_blocked && (
          <button
            type="button"
            onClick={() => void blockConversation()}
            disabled={sending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            <Ban size={14} /> Block conversation
          </button>
        )}
      </header>
      {conversation?.is_blocked && (
        <div role="status" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          This conversation is blocked. You can review its history, but no new messages can be sent.
        </div>
      )}
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => { setLoading(true); void load(); void loadConversation() }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ink-soft transition hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
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
              <div className={`mt-1 flex items-center gap-1 text-[10px] text-ink-soft ${mine ? 'justify-end' : ''}`}>
                <time dateTime={message.created_at}>{messageTime(message.created_at)}</time>
                {mine && (
                  <span className="inline-flex items-center gap-0.5" aria-label={message.is_read ? 'Seen' : 'Sent'}>
                    {message.is_read ? <CheckCheck size={12} className="text-teal" /> : <Check size={12} />}
                    {message.is_read ? 'Seen' : 'Sent'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {!loading && !messages.length && <p className="text-sm text-ink-soft m-auto text-center">Say hello and start the conversation.</p>}
        <div ref={bottomRef} />
      </section>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {!conversation?.is_blocked && (
        <>
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
        </>
      )}
    </div>
  )
}
