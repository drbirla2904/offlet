import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notificationsApi } from '../api/endpoints'
import type { Notification } from '../types'

export function AccountPage() {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    notificationsApi.list().then((r) => setNotifications(r.results))
  }, [])

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-ink">{user.username}</h1>
      <p className="text-sm text-ink-soft">{user.phone_number}{user.email ? ` · ${user.email}` : ''}</p>

      {user.role === 'shopkeeper' && (
        <Link to="/dashboard" className="block mt-4 bg-marigold text-white rounded-xl py-3 text-center text-sm font-semibold">
          Go to Shopkeeper Dashboard →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link to="/saved" className="bg-canvas rounded-xl py-3 text-center text-sm font-medium text-ink">❤️ Saved</Link>
        <Link to="/account/messages" className="bg-canvas rounded-xl py-3 text-center text-sm font-medium text-ink">💬 Messages</Link>
      </div>

      <h2 className="font-display text-lg font-semibold text-ink mt-6 mb-2">Notifications</h2>
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? 'border-border' : 'border-marigold bg-marigold-soft'}`}>
            <p className="text-sm font-semibold text-ink">{n.title}</p>
            {n.body && <p className="text-xs text-ink-soft mt-0.5">{n.body}</p>}
          </div>
        ))}
        {!notifications.length && <p className="text-sm text-ink-soft">No notifications yet.</p>}
      </div>

      <button onClick={logout} className="text-sm text-red-600 mt-6">Log out</button>
    </div>
  )
}
