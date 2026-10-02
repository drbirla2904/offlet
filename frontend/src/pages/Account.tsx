import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Bell, Bookmark, ChevronRight, LogOut, MessageCircle, Store, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { notificationsApi } from '../api/endpoints'
import type { Notification } from '../types'

export function AccountPage() {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsError, setNotificationsError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    notificationsApi.list()
      .then((response) => setNotifications(response.results))
      .catch(() => setNotificationsError('Notifications could not be loaded.'))
  }, [])

  if (!user) return null

  const signOut = () => {
    logout()
    navigate('/')
  }
  const joinedDate = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(user.date_joined))

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-7 sm:pt-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Your account</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Profile & activity</h1>
        </div>
        <button onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-ink-soft transition hover:border-red-300 hover:text-red-700">
          <LogOut size={16} /> Sign out
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <section aria-labelledby="profile-heading" className="border-b border-border pb-7">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-soft text-teal">
                <UserRound size={30} strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="profile-heading" className="font-display text-2xl font-semibold text-ink">{user.username}</h2>
                  {user.is_phone_verified && <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[11px] font-semibold text-success"><BadgeCheck size={13} /> Verified</span>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{user.role === 'shopkeeper' ? 'Shopkeeper account' : 'Customer account'} · Member since {joinedDate}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border-l-2 border-teal-soft pl-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Phone number</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{user.phone_number}</dd>
              </div>
              <div className="border-l-2 border-teal-soft pl-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Email</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-ink">{user.email || 'Not added'}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="notifications-heading" className="pt-7">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Updates</p>
                <h2 id="notifications-heading" className="mt-1 font-display text-xl font-semibold text-ink">Notifications</h2>
              </div>
              <Bell size={19} className="text-teal" aria-hidden="true" />
            </div>
            {notificationsError ? (
              <p role="alert" className="border-l-2 border-red-500 py-2 pl-3 text-sm text-red-700">{notificationsError}</p>
            ) : notifications.length ? (
              <div className="divide-y divide-border border-y border-border">
                {notifications.map((notification) => (
                  <article key={notification.id} className="flex gap-3 py-4">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-border' : 'bg-marigold'}`} aria-label={notification.is_read ? 'Read' : 'Unread'} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{notification.title}</h3>
                      {notification.body && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{notification.body}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="border-y border-border py-6 text-sm text-ink-soft">You’re all caught up. New updates will appear here.</p>
            )}
          </section>
        </div>

        <aside className="h-fit border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Shortcuts</p>
          <nav aria-label="Account shortcuts" className="mt-3 divide-y divide-border border-y border-border">
            <Link to="/saved" className="group flex items-center gap-3 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-soft text-marigold"><Bookmark size={17} /></span>
              <span className="flex-1 text-sm font-semibold text-ink">Saved offers</span>
              <ChevronRight size={17} className="text-ink-soft transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/account/messages" className="group flex items-center gap-3 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal"><MessageCircle size={17} /></span>
              <span className="flex-1 text-sm font-semibold text-ink">Messages</span>
              <ChevronRight size={17} className="text-ink-soft transition group-hover:translate-x-0.5" />
            </Link>
            {user.role === 'shopkeeper' && (
              <Link to="/dashboard" className="group flex items-center gap-3 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-soft text-amber"><Store size={17} /></span>
                <span className="flex-1 text-sm font-semibold text-ink">Shopkeeper dashboard</span>
                <ChevronRight size={17} className="text-ink-soft transition group-hover:translate-x-0.5" />
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </div>
  )
}
