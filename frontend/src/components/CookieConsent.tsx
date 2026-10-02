import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'offlet-cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = window.localStorage.getItem(STORAGE_KEY)
    setVisible(consent !== 'accepted')
  }, [])

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-14px_32px_rgba(15,23,42,0.12)] backdrop-blur" aria-live="polite">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm leading-6 text-ink-soft">
          OFFlet uses essential browser storage for features such as your location and saved preferences. You can review the cookie policy and manage your choices before continuing.
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link to="/cookies" className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas">
            Cookie policy
          </Link>
          <button type="button" onClick={accept} className="inline-flex h-10 items-center rounded-lg bg-marigold px-4 text-sm font-semibold text-white hover:bg-marigold/90">
            Accept cookies
          </button>
        </div>
      </div>
    </div>
  )
}
