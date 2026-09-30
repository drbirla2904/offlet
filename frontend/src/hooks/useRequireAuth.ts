import { useAuth } from '../context/AuthContext'

/**
 * Wrap any action that requires login (save, follow, review, report, chat).
 * Guests get the "Login to continue" modal instead of a hard redirect —
 * section 3 of the product spec.
 */
export function useRequireAuth() {
  const { isAuthenticated, openLoginModal } = useAuth()

  return function requireAuth<T extends (...args: any[]) => any>(action: T, message?: string) {
    return (...args: Parameters<T>) => {
      if (!isAuthenticated) {
        openLoginModal(message)
        return undefined
      }
      return action(...args)
    }
  }
}
