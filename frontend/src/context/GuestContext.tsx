import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient } from '../api/client'

const GUEST_ID_KEY = 'lo_guest_id'

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface GuestContextValue {
  guestId: string
  recentlyViewed: number[]
  addRecentlyViewed: (offerId: number) => void
}

const GuestContext = createContext<GuestContextValue | null>(null)

/**
 * Section 39 of the product spec: guests get non-sensitive, remembered
 * preferences (recently viewed, search history) keyed by a client-generated
 * UUID — no login needed. Synced to the backend so it can be migrated into
 * a real account on registration (see authApi.verifyOtp's guest_id).
 */
export function GuestProvider({ children }: { children: ReactNode }) {
  const [guestId] = useState(() => {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  })
  const [recentlyViewed, setRecentlyViewed] = useState<number[]>([])

  useEffect(() => {
    apiClient
      .get(`/auth/guest-session/${guestId}/`)
      .then((r) => setRecentlyViewed(r.data.recently_viewed_offer_ids || []))
      .catch(() => {})
  }, [guestId])

  const addRecentlyViewed = (offerId: number) => {
    setRecentlyViewed((prev) => {
      const next = [offerId, ...prev.filter((id) => id !== offerId)].slice(0, 20)
      apiClient.put(`/auth/guest-session/${guestId}/`, { recently_viewed_offer_ids: next }).catch(() => {})
      return next
    })
  }

  const value = useMemo(() => ({ guestId, recentlyViewed, addRecentlyViewed }), [guestId, recentlyViewed])
  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error('useGuest must be used inside GuestProvider')
  return ctx
}
