import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { authApi, type ShopkeeperLegalStatus } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { ShopkeeperLegalGate } from './ShopkeeperLegalGate'

function ShopkeeperLegalRequirement({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [legalStatus, setLegalStatus] = useState<ShopkeeperLegalStatus | null>(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    authApi.shopkeeperLegalStatus()
      .then((status) => { if (active) setLegalStatus(status) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [user?.id, retryKey])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-700">Shopkeeper policy status could not be checked.</p>
        <button type="button" onClick={() => { setError(false); setRetryKey((value) => value + 1) }} className="mt-4 text-sm font-semibold text-teal">Try again</button>
      </div>
    )
  }
  if (!legalStatus) return <p className="py-12 text-center text-sm text-ink-soft">Checking shop policies…</p>
  if (!legalStatus.accepted) return <ShopkeeperLegalGate onAccepted={setLegalStatus} />
  return <>{children}</>
}

export function RequireShopkeeper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="text-center text-ink-soft py-10 text-sm">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'shopkeeper') return <Navigate to="/" replace />
  return <ShopkeeperLegalRequirement>{children}</ShopkeeperLegalRequirement>
}
