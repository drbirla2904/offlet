import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/endpoints'
import { LOGIN_REQUIRED_EVENT, tokenStore } from '../api/client'
import { useGuest } from './GuestContext'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  loginModalOpen: boolean
  loginModalMessage: string
  openLoginModal: (message?: string) => void
  closeLoginModal: () => void
  requestOtp: (phoneNumber: string) => Promise<{ expiresIn: number; debugOtp?: string }>
  verifyOtp: (phoneNumber: string, otp: string, role?: 'customer' | 'shopkeeper', username?: string) => Promise<{ user: User; created: boolean }>
  logout: () => void
  refreshMe: () => Promise<void>
}

const DEFAULT_LOGIN_MESSAGE =
  'Verify your number to save offers, follow shops and receive local deal alerts.'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { guestId } = useGuest()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginModalMessage, setLoginModalMessage] = useState(DEFAULT_LOGIN_MESSAGE)

  const refreshMe = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  useEffect(() => {
    const handler = () => {
      if (!tokenStore.getAccess()) setLoginModalOpen(true)
    }
    window.addEventListener(LOGIN_REQUIRED_EVENT, handler)
    return () => window.removeEventListener(LOGIN_REQUIRED_EVENT, handler)
  }, [])

  const requestOtp = async (phoneNumber: string) => {
    const res = await authApi.requestOtp(phoneNumber)
    return { expiresIn: res.expires_in, debugOtp: res.debug_otp }
  }

  const verifyOtp = async (
    phoneNumber: string,
    otp: string,
    role?: 'customer' | 'shopkeeper',
    username?: string
  ) => {
    const res = await authApi.verifyOtp({ phone_number: phoneNumber, otp, role, username, guest_id: guestId })
    tokenStore.set(res.tokens.access, res.tokens.refresh)
    setUser(res.user)
    setLoginModalOpen(false)
    return { user: res.user, created: res.created }
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  const openLoginModal = (message?: string) => {
    setLoginModalMessage(message || DEFAULT_LOGIN_MESSAGE)
    setLoginModalOpen(true)
  }
  const closeLoginModal = () => setLoginModalOpen(false)

  const value = useMemo(
    () => ({
      user, loading, isAuthenticated: !!user, loginModalOpen, loginModalMessage,
      openLoginModal, closeLoginModal, requestOtp, verifyOtp, logout, refreshMe,
    }),
    [user, loading, loginModalOpen, loginModalMessage]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
