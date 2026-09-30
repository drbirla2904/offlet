import { useAuth } from '../context/AuthContext'
import { PhoneOtpForm } from './PhoneOtpForm'

export function LoginModal() {
  const { loginModalOpen, loginModalMessage, closeLoginModal } = useAuth()

  if (!loginModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-xl">
        <div className="flex justify-between items-start gap-3 mb-3">
          <h2 className="font-display text-2xl font-semibold text-ink">Login to continue</h2>
          <button
            onClick={closeLoginModal}
            className="shrink-0 w-9 h-9 -mr-1.5 -mt-1 flex items-center justify-center text-ink-soft text-2xl leading-none rounded-full active:bg-canvas"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-ink-soft text-sm mb-5">{loginModalMessage}</p>

        <PhoneOtpForm onSuccess={() => closeLoginModal()} />

        <button type="button" onClick={closeLoginModal} className="text-ink-soft text-sm py-1 mt-3 w-full text-center">
          Continue Browsing
        </button>
      </div>
    </div>
  )
}
