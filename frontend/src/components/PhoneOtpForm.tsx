import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'
import { useWebOtpAutofill } from '../hooks/useWebOtpAutofill'
import type { User } from '../types'

const RESEND_COOLDOWN = 30 // must match PhoneOTP.RESEND_COOLDOWN_SECONDS on the backend

/**
 * Two-step phone + OTP sign-in, shared by the full-page Login screen and the
 * "Login to continue" modal. Role/name are shown alongside the OTP input
 * (rather than as a separate step) because the backend can't tell us in
 * advance whether a phone number is already registered without a separate
 * lookup call — and adding one would let the API be used to enumerate
 * registered phone numbers. They're harmless to show for a returning user:
 * the backend ignores them once an account already exists.
 */
export function PhoneOtpForm({ onSuccess }: { onSuccess?: (user: User, created: boolean) => void }) {
  const { requestOtp, verifyOtp } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [role, setRole] = useState<'customer' | 'shopkeeper'>('customer')
  const [name, setName] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => Math.max(c - 1, 0)), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // Auto-fills from an incoming SMS on Chrome for Android / the TWA wrapper —
  // a no-op everywhere else, the user just types the code as normal there.
  useWebOtpAutofill(step === 'otp', (code) => setOtp(code))

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await requestOtp(phone)
      setStep('otp')
      setCooldown(RESEND_COOLDOWN)
      if (res.debugOtp) {
        showToast(`DEV MODE — no SMS sent. Your code is ${res.debugOtp}`, 'info')
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't send a code — check the number and try again."))
    } finally {
      setBusy(false)
    }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { user, created } = await verifyOtp(phone, otp, role, name || undefined)
      onSuccess?.(user, created)
    } catch (err) {
      setError(apiErrorMessage(err, 'Incorrect or expired code — please try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOtp} className="flex flex-col gap-3">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
          className="border border-border rounded-xl px-4 py-2.5 text-sm"
          placeholder="Mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !phone} className="bg-marigold text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={submitOtp} className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-soft">Code sent to {phone}</span>
        <button type="button" onClick={() => setStep('phone')} className="text-teal font-medium shrink-0">
          Edit
        </button>
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        className="border border-border rounded-xl px-4 py-2.5 text-sm tracking-[0.3em] text-center"
        placeholder="6-digit code"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        required
      />

      <div className="bg-canvas rounded-xl p-3">
        <p className="text-xs text-ink-soft mb-2">New here? Tell us which you are (ignored if you already have an account):</p>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium ${role === 'customer' ? 'bg-marigold text-white' : 'bg-surface text-ink-soft'}`}
          >
            I'm a Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('shopkeeper')}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium ${role === 'shopkeeper' ? 'bg-marigold text-white' : 'bg-surface text-ink-soft'}`}
          >
            I'm a Shopkeeper
          </button>
        </div>
        <input
          className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-surface"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy || otp.length < 4} className="bg-marigold text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
        {busy ? 'Verifying…' : 'Verify & Continue'}
      </button>
      <button
        type="button"
        onClick={() => sendOtp()}
        disabled={cooldown > 0 || busy}
        className="text-sm text-ink-soft disabled:opacity-50"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  )
}
