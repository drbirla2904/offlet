import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoriesApi, offersApi } from '../api/endpoints'
import type { Category, Offer } from '../types'
import { OfferCard } from '../components/OfferCard'
import { useLocationContext } from '../context/LocationContext'

const ORDERINGS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'distance', label: 'Nearest' },
  { value: '-discount', label: 'Highest Discount' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: '-popular', label: 'Most Popular' },
]

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const { latitude, longitude } = useLocationContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(params.get('q') || '')

  useEffect(() => {
    categoriesApi.list().then(setCategories)
  }, [])

  useEffect(() => {
    setLoading(true)
    offersApi
      .list({
        search: params.get('q') || undefined,
        category: params.get('category') ? Number(params.get('category')) : undefined,
        min_discount: params.get('min_discount') ? Number(params.get('min_discount')) : undefined,
        max_price: params.get('max_price') ? Number(params.get('max_price')) : undefined,
        verified_only: params.get('verified_only') === 'true' || undefined,
        expiring_soon: params.get('expiring_soon') === 'true' || undefined,
        ordering: params.get('ordering') || '-created_at',
        lat: latitude ?? undefined,
        lng: longitude ?? undefined,
      })
      .then((r) => setOffers(r.results))
      .finally(() => setLoading(false))
  }, [params, latitude, longitude])

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <div className="pb-24 sm:pb-8 max-w-5xl mx-auto px-4 pt-4">
      <form onSubmit={(e) => { e.preventDefault(); update('q', q || null) }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, shops or offers…"
          className="w-full bg-canvas border border-border rounded-full px-4 py-2.5 text-sm mb-3"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        <select
          value={params.get('category') || ''}
          onChange={(e) => update('category', e.target.value || null)}
          className="shrink-0 bg-canvas border border-border rounded-full px-3 py-1.5 text-xs"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => update('min_discount', params.get('min_discount') ? null : '50')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${params.get('min_discount') ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border'}`}
        >
          50%+ off
        </button>
        <button
          onClick={() => update('max_price', params.get('max_price') ? null : '499')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${params.get('max_price') ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border'}`}
        >
          Under ₹499
        </button>
        <button
          onClick={() => update('verified_only', params.get('verified_only') ? null : 'true')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${params.get('verified_only') ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border'}`}
        >
          Verified shops
        </button>
        <button
          onClick={() => update('expiring_soon', params.get('expiring_soon') ? null : 'true')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${params.get('expiring_soon') ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border'}`}
        >
          Expiring soon
        </button>
        <select
          value={params.get('ordering') || '-created_at'}
          onChange={(e) => update('ordering', e.target.value)}
          className="shrink-0 bg-canvas border border-border rounded-full px-3 py-1.5 text-xs"
        >
          {ORDERINGS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-ink-soft py-10 text-sm">Searching…</p>
      ) : (
        <div className="flex flex-wrap gap-3 mt-3">
          {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
          {!offers.length && <p className="text-sm text-ink-soft py-10 w-full text-center">No offers match these filters yet.</p>}
        </div>
      )}
    </div>
  )
}
