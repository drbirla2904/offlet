import { useEffect, useState } from 'react'
import { notificationsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

/** Polls the unread notification count every 30s while logged in. Used to
 * show a badge dot on the bottom nav / account link without a full
 * push-notification setup. */
export function useUnreadNotifications() {
  const { isAuthenticated } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setCount(0)
      return
    }
    let cancelled = false
    const poll = () => {
      notificationsApi
        .unreadCount()
        .then((r) => { if (!cancelled) setCount(r.count) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [isAuthenticated])

  return count
}
