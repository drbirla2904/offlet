import { useEffect, useState } from 'react'
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumber,
  type Country,
} from 'react-phone-number-input'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'
import { useWebOtpAutofill } from '../hooks/useWebOtpAutofill'
import type { User } from '../types'

const RESEND_COOLDOWN = 30 // must match PhoneOTP.RESEND_COOLDOWN_SECONDS on the backend
const PHONE_COUNTRY_CACHE_KEY = 'lo_phone_country'
const countries = getCountries()
const countryNames = new Intl.DisplayNames(
  [typeof navigator === 'undefined' ? 'en' : navigator.language],
  { type: 'region' }
)
const countryOptions = countries
  .map((country) => ({ country, name: countryNames.of(country) || country }))
  .sort((first, second) => first.name.localeCompare(second.name))

function getDeviceCountry(): Country {
  const locales = typeof navigator === 'undefined'
    ? []
    : navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).region
      if (region && countries.includes(region as Country)) return region as Country
    } catch {
      // Ignore malformed browser locales and fall back to the app's primary market.
    }
  }
  return 'IN'
}

function getPreferredCountry(): Country {
  try {
    const cachedCountry = localStorage.getItem(PHONE_COUNTRY_CACHE_KEY)
    if (cachedCountry && countries.includes(cachedCountry as Country)) {
      return cachedCountry as Country
    }
  } catch {
    // Private browsing may disable storage; use the device locale instead.
  }
  return getDeviceCountry()
}

export function PhoneOtpForm({ onSuccess }: { onSuccess?: (user: User, created: boolean) => void }) {
  const { requestOtp, verifyOtp, completeRegistration } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone')
  const [country, setCountry] = useState<Country>(getPreferredCountry)
  const [mobileNumber, setMobileNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [role, setRole] = useState<'customer' | 'shopkeeper'>('customer')
  const [name, setName] = useState('')
  const [registrationToken, setRegistrationToken] = useState('')
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

  const phone = mobileNumber ? parsePhoneNumber(mobileNumber, country)?.number : undefined
  const phoneIsValid = !!mobileNumber && isValidPhoneNumber(mobileNumber, country)

  const changeCountry = (value: string) => {
    const nextCountry = value as Country
    if (!countries.includes(nextCountry)) return
    setCountry(nextCountry)
    try {
      localStorage.setItem(PHONE_COUNTRY_CACHE_KEY, nextCountry)
    } catch {
      // The selected country remains available for this form session.
    }
  }

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!phone || !phoneIsValid) {
      setError('Enter a valid mobile number for the selected country.')
      return
    }
    setBusy(true)
    try {
      const res = await requestOtp(phone)
      setOtp('')
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
      if (!phone) return
      const result = await verifyOtp(phone, otp)
      if (result.requiresProfileSetup) {
        setRegistrationToken(result.registrationToken)
        setStep('profile')
      } else {
        onSuccess?.(result.user, result.created)
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Incorrect or expired code — please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { user, created } = await completeRegistration(registrationToken, name.trim(), role)
      onSuccess?.(user, created)
    } catch (err) {
      setError(apiErrorMessage(err, 'Your verified session expired. Please request a new code.'))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOtp} className="flex flex-col gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
            Country code
            <select
              autoFocus
              autoComplete="country"
              aria-label="Country calling code"
              className="h-11 w-full rounded-xl border border-border bg-surface px-2.5 text-sm font-medium text-ink"
              value={country}
              onChange={(event) => changeCountry(event.target.value)}
            >
              {countryOptions.map(({ country: countryCode, name }) => (
                <option key={countryCode} value={countryCode}>
                  {name} (+{getCountryCallingCode(countryCode)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
            Mobile number
            <input
              autoComplete="tel-national"
              inputMode="tel"
              type="tel"
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-normal text-ink"
              placeholder="Enter mobile number"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !phoneIsValid} className="bg-marigold text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    )
  }

  if (step === 'profile') {
    return (
      <ProfileSetupForm
        role={role}
        setRole={setRole}
        name={name}
        setName={setName}
        error={error}
        busy={busy}
        submitProfile={submitProfile}
      />
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

function ProfileSetupForm({
  role,
  setRole,
  name,
  setName,
  error,
  busy,
  submitProfile,
}: {
  role: 'customer' | 'shopkeeper'
  setRole: (role: 'customer' | 'shopkeeper') => void
  name: string
  setName: (name: string) => void
  error: string
  busy: boolean
  submitProfile: (event: React.FormEvent) => void
}) {
  return (
    <form onSubmit={submitProfile} className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-xl font-semibold text-ink">Set up your profile</h3>
        <p className="mt-1 text-sm text-ink-soft">Your number is verified. Add your name and choose how you’ll use LocalOffers.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Your name
        <input
          autoComplete="name"
          autoFocus
          required
          maxLength={150}
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm font-normal"
          placeholder="Enter your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div role="group" aria-label="Account type" className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole('customer')}
            aria-pressed={role === 'customer'}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${role === 'customer' ? 'border-marigold bg-marigold-soft text-marigold-dark' : 'border-border bg-surface text-ink-soft'}`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('shopkeeper')}
            aria-pressed={role === 'shopkeeper'}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${role === 'shopkeeper' ? 'border-marigold bg-marigold-soft text-marigold-dark' : 'border-border bg-surface text-ink-soft'}`}
          >
            Shopkeeper
          </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !name.trim()} className="w-full rounded-xl bg-marigold py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
