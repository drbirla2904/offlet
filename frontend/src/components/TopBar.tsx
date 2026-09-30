import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogIn, LogOut, MapPin, MapPinned, MessageCircle, Search, Store, UserRound } from 'lucide-react'
import { useLocationContext } from '../context/LocationContext'
import { useAuth } from '../context/AuthContext'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-marigold-soft text-marigold-dark' : 'text-ink-soft hover:bg-canvas hover:text-ink'}`

export function TopBar() {
  const { city, setCity, requestBrowserLocation, locating } = useLocationContext()
  const { isAuthenticated, user, logout } = useAuth()
  const unreadCount = useUnreadNotifications()
  const [editingCity, setEditingCity] = useState(false)
  const [cityInput, setCityInput] = useState(city)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const submitCity = (event: React.FormEvent) => {
    event.preventDefault()
    const nextCity = cityInput.trim()
    if (nextCity) setCity(nextCity)
    setEditingCity(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 shadow-sm backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:gap-x-4 sm:gap-y-3 sm:px-4 sm:py-3">
        <Link to="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="LocalOffers home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-marigold text-white shadow-sm">
            <Store size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold text-ink sm:text-lg">Local<span className="text-marigold">Offers</span></span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          <NavLink to="/search" className={navLinkClass}>Explore</NavLink>
          <NavLink to="/categories" className={navLinkClass}>Categories</NavLink>
          <NavLink to="/list-your-business" className={navLinkClass}>For shops</NavLink>
        </nav>

        <form onSubmit={submitSearch} role="search" className="order-last flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-canvas px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/15 lg:order-none lg:ml-auto lg:w-auto lg:max-w-md lg:flex-1">
          <Search size={18} className="shrink-0 text-ink-soft" aria-hidden="true" />
          <label htmlFor="site-search" className="sr-only">Search local offers</label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shops, products, offers"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ink-soft/70 focus:ring-0"
          />
          <kbd className="hidden rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-ink-soft xl:inline">Enter</kbd>
        </form>

        <div className="relative ml-auto lg:ml-0">
          <button
            type="button"
            onClick={() => { setCityInput(city); setEditingCity((open) => !open) }}
            aria-expanded={editingCity}
            aria-label={`Set location. Current city: ${city}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:w-auto sm:max-w-44 sm:justify-start sm:px-2"
          >
            <MapPin size={17} className="shrink-0 text-teal" aria-hidden="true" />
            <span className="hidden truncate sm:inline">{city}</span>
            <ChevronDown size={14} className="hidden shrink-0 sm:block" aria-hidden="true" />
          </button>
          {editingCity && (
            <div className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-3 shadow-lg">
              <form onSubmit={submitCity} className="flex gap-2">
                <label htmlFor="city-input" className="sr-only">City</label>
                <input id="city-input" autoFocus value={cityInput} onChange={(event) => setCityInput(event.target.value)} placeholder="Enter your city" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 text-sm" />
                <button className="rounded-lg bg-ink px-3 text-sm font-semibold text-white transition-colors hover:bg-ink/85">Set</button>
              </form>
              <button type="button" onClick={() => { requestBrowserLocation(); setEditingCity(false) }} disabled={locating} className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-teal hover:bg-teal-soft disabled:opacity-60">
                <MapPinned size={16} aria-hidden="true" />
                {locating ? 'Finding your location…' : 'Use my current location'}
              </button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isAuthenticated && (
            <Link to="/account/messages" aria-label="Messages" title="Messages" className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:flex">
              <MessageCircle size={19} aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-marigold ring-2 ring-surface" />}
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <Link to="/account" className="hidden max-w-32 truncate rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas sm:block">{user?.username || 'Account'}</Link>
              <button onClick={logout} aria-label="Log out" title="Log out" className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:flex">
                <LogOut size={18} aria-hidden="true" />
              </button>
            </>
          ) : (
            <Link to="/login" className="flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-sm font-semibold text-white transition-colors hover:bg-ink/85">
              <LogIn size={17} aria-hidden="true" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
          {isAuthenticated ? (
            <Link to="/account" aria-label="Account" title="Account" className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:hidden">
              <UserRound size={18} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/list-your-business" aria-label="List your business" title="List your business" className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-canvas hover:text-ink max-[360px]:hidden md:hidden">
              <Store size={18} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}