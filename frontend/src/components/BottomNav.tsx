import { NavLink } from 'react-router-dom'
import { Heart, House, MessageCircle, Search, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'

const ITEMS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/search', label: 'Explore', icon: Search },
  { to: '/account/messages', label: 'Inbox', icon: MessageCircle, authGuarded: true },
  { to: '/saved', label: 'Saved', icon: Heart, authGuarded: true },
  { to: '/account', label: 'Account', icon: UserRound, authGuarded: true },
]

export function BottomNav() {
  const { isAuthenticated, openLoginModal } = useAuth()
  const unreadCount = useUnreadNotifications()

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface/95 shadow-[0_-8px_28px_rgba(23,37,42,0.07)] backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {ITEMS.map((item) =>
        item.authGuarded && !isAuthenticated ? (
          <button
            key={item.to}
            onClick={() => openLoginModal()}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-xl">
              <item.icon size={20} strokeWidth={1.9} aria-hidden="true" />
            </span>
            {item.label}
          </button>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-marigold-dark' : 'text-ink-soft hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`relative flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-marigold-soft' : ''}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                  {(item.to === '/account/messages' || item.to === '/account') && unreadCount > 0 && (
                    <span className="absolute right-1 top-0 min-w-4 h-4 rounded-full bg-marigold px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-surface">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        )
      )}
    </nav>
  )
}
