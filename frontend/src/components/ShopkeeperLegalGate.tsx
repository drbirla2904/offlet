import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, FileCheck2, LockKeyhole } from 'lucide-react'
import { authApi, type ShopkeeperLegalStatus } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

export function ShopkeeperLegalGate({ onAccepted }: { onAccepted: (status: ShopkeeperLegalStatus) => void }) {
  const { user } = useAuth()
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, offers: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canAccept = agreements.terms && agreements.privacy && agreements.offers

  const accept = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canAccept || busy) return
    setBusy(true)
    setError('')
    try {
      onAccepted(await authApi.acceptShopkeeperLegal())
    } catch {
      setError('We could not record your acceptance. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (key: keyof typeof agreements) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreements((current) => ({ ...current, [key]: event.target.checked }))
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-soft text-teal"><LockKeyhole size={22} /></div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-teal">Shopkeeper account</p>
      <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-ink">Review and accept current shop policies</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">Before you create or manage a shop listing, please review how OFFlet works, how shop data is handled, and the rules for offers you publish. Your choice is recorded with the policy versions and time of acceptance.</p>
      <div className="mt-6 flex items-center gap-3 border-y border-border py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas font-display text-sm font-semibold text-ink">
          {(user?.username?.trim().charAt(0) || 'S').toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user?.username?.trim() || 'Shopkeeper profile'}</p>
          <p className="text-xs text-ink-soft">{user?.phone_number || 'Signed-in shopkeeper account'}</p>
        </div>
      </div>

      <nav aria-label="Policies to review" className="mt-7 divide-y divide-border border-y border-border">
        <Link to="/terms" target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-4">
          <FileCheck2 size={18} className="text-teal" />
          <span className="flex-1 text-sm font-semibold text-ink">Terms of Service</span>
          <span className="text-xs font-semibold text-teal group-hover:underline">Read terms</span>
        </Link>
        <Link to="/privacy" target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-4">
          <FileCheck2 size={18} className="text-teal" />
          <span className="flex-1 text-sm font-semibold text-ink">Privacy Policy</span>
          <span className="text-xs font-semibold text-teal group-hover:underline">Read policy</span>
        </Link>
        <Link to="/shopkeeper-terms" target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-4">
          <FileCheck2 size={18} className="text-teal" />
          <span className="flex-1 text-sm font-semibold text-ink">Shopkeeper & Offer Rules</span>
          <span className="text-xs font-semibold text-teal group-hover:underline">Read rules</span>
        </Link>
      </nav>

      <form onSubmit={accept} className="mt-6 space-y-3">
        <label className="flex items-start gap-3 py-1 text-sm leading-5 text-ink">
          <input type="checkbox" checked={agreements.terms} onChange={toggle('terms')} className="mt-0.5" />
          <span>I agree to the <Link to="/terms" target="_blank" className="font-semibold text-teal underline">Terms of Service</Link>.</span>
        </label>
        <label className="flex items-start gap-3 py-1 text-sm leading-5 text-ink">
          <input type="checkbox" checked={agreements.privacy} onChange={toggle('privacy')} className="mt-0.5" />
          <span>I acknowledge the <Link to="/privacy" target="_blank" className="font-semibold text-teal underline">Privacy Policy</Link>.</span>
        </label>
        <label className="flex items-start gap-3 py-1 text-sm leading-5 text-ink">
          <input type="checkbox" checked={agreements.offers} onChange={toggle('offers')} className="mt-0.5" />
          <span>I agree to follow the <Link to="/shopkeeper-terms" target="_blank" className="font-semibold text-teal underline">Shopkeeper & Offer Rules</Link> for every listing I manage.</span>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={!canAccept || busy} className="inline-flex h-11 items-center gap-2 bg-marigold px-5 text-sm font-semibold text-white transition hover:bg-marigold-dark disabled:cursor-not-allowed disabled:opacity-50">
          <BadgeCheck size={17} />{busy ? 'Recording acceptance…' : 'Accept and continue'}
        </button>
      </form>
      <p className="mt-5 max-w-2xl text-xs leading-5 text-ink-soft">Acceptance is required for shop and offer changes. You can still turn off an active offer if you need to remove it.</p>
    </main>
  )
}