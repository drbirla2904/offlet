import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { offersApi } from '../../api/endpoints'
import type { Offer, OfferStatus } from '../../types'
import { formatINR } from '../../utils/format'

const TABS: { value: OfferStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'draft', label: 'Drafts' },
]

export function ShopkeeperOfferListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('status') as OfferStatus | 'all' | null
  const [tab, setTab] = useState<OfferStatus | 'all'>(TABS.some((item) => item.value === requestedTab) ? requestedTab! : 'active')
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    offersApi.list({ mine: true, status: tab === 'all' ? undefined : tab }).then((r) => setOffers(r.results)).finally(() => setLoading(false))
  }

  useEffect(load, [tab])

  const act = async (fn: () => Promise<any>) => {
    await fn()
    load()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">My Offers</h1>
        <Link to="/dashboard/offers/new" className="bg-marigold text-white rounded-full px-4 py-2 text-sm font-semibold">+ New Offer</Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value)
              setSearchParams(t.value === 'active' ? {} : { status: t.value })
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${tab === t.value ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((o) => (
            <div key={o.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink line-clamp-2">{o.title}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {formatINR(o.offer_price)} <span className="line-through">{formatINR(o.original_price)}</span> · {o.discount_percentage}% OFF
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {o.view_count} views · {o.favorite_count} saves
                    {o.total_stock != null && ` · ${o.available_stock}/${o.total_stock} in stock`}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  o.status === 'active' ? 'bg-success-soft text-success'
                  : o.status === 'paused' ? 'bg-amber-soft text-amber'
                  : o.status === 'draft' ? 'bg-canvas text-ink-soft'
                  : 'bg-red-50 text-red-600'
                }`}>
                  ● {o.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link to={`/dashboard/offers/${o.id}/edit`} className="text-xs font-medium bg-canvas rounded-full px-3 py-1.5">Edit</Link>
                {(o.status === 'draft' || o.status === 'paused') && (
                  <button onClick={() => act(() => o.status === 'draft' ? offersApi.publish(o.id) : offersApi.turnOn(o.id))} className="text-xs font-medium bg-success text-white rounded-full px-3 py-1.5">
                    Turn ON
                  </button>
                )}
                {o.status === 'active' && (
                  <button onClick={() => act(() => offersApi.turnOff(o.id))} className="text-xs font-medium bg-canvas rounded-full px-3 py-1.5">Turn OFF</button>
                )}
                <button onClick={() => act(() => offersApi.duplicate(o.id))} className="text-xs font-medium bg-canvas rounded-full px-3 py-1.5">Duplicate</button>
                <button
                  onClick={() => {
                    if (confirm('Delete this offer permanently?')) act(() => offersApi.remove(o.id))
                  }}
                  className="text-xs font-medium text-red-600 bg-canvas rounded-full px-3 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!offers.length && <p className="text-sm text-ink-soft">No offers in this tab yet.</p>}
        </div>
      )}
    </div>
  )
}
