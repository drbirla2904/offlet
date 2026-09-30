import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireShopkeeper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="text-center text-ink-soft py-10 text-sm">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'shopkeeper') return <Navigate to="/" replace />
  return <>{children}</>
}
