import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoriesApi, offersApi } from '../api/endpoints'
import type { OfferListParams } from '../api/endpoints'
import type { Category, Offer } from '../types'
import { OfferCard } from '../components/OfferCard'
import { useLocationContext } from '../context/LocationContext'
import { OFFER_TAGS } from '../utils/constants'
import { TAG_LABELS } from '../utils/format'

const ORDERINGS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'distance', label: 'Nearest' },
  { value: '-discount', label: 'Highest Discount' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: '-popular', label: 'Most Popular' },
]

function buildSearchParams(params: URLSearchParams, latitude: number | null, longitude: number | null, city: string): OfferListParams {
  const hasCoordinates = latitude != null && longitude != null
  return {
    search: params.get('q')?.trim() || undefined,
    tag: params.get('tag') || undefined,
    category: params.get('category') ? Number(params.get('category')) : undefined,
    min_discount: params.get('min_discount') ? Number(params.get('min_discount')) : undefined,
    max_price: params.get('max_price') ? Number(params.get('max_price')) : undefined,
    verified_only: params.get('verified_only') === 'true' || undefined,
    expiring_soon: params.get('expiring_soon') === 'true' || undefined,
    ordering: params.get('ordering') || '-created_at',
    radius_km: hasCoordinates && params.get('radius_km') ? Number(params.get('radius_km')) : undefined,
    lat: hasCoordinates ? latitude : undefined,
    lng: hasCoordinates ? longitude : undefined,
    city: hasCoordinates ? undefined : city || undefined,
  }
}

function SearchBox({ initialQuery, onSearch }: { initialQuery: string; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery)

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSearch(query) }}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search offers, products, shops, categories, or tags"
        placeholder="Search offers, products, shops, categories or tags…"
        className="mb-3 w-full rounded-full border border-border bg-canvas px-4 py-2.5 text-sm"
      />
    </form>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const { latitude, longitude, city } = useLocationContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loadedSearchKey, setLoadedSearchKey] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})
  const searchKey = `${params.toString()}|${latitude ?? ''}|${longitude ?? ''}|${city}`
  const loading = loadedSearchKey !== searchKey

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    offersApi
      .list({ ...buildSearchParams(params, latitude, longitude, city), page: 1 })
      .then((response) => {
        if (!active) return
        setError('')
        setOffers(response.results)
        setTotalCount(response.count)
        setNextPage(response.next ? 2 : null)
      })
      .catch(() => {
        if (!active) return
        setOffers([])
        setNextPage(null)
        setError('Search is temporarily unavailable. Please try again.')
      })
      .finally(() => {
        if (active) setLoadedSearchKey(searchKey)
      })

    return () => { active = false }
  }, [params, latitude, longitude, city, searchKey])

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setError('')
    setParams(next)
  }

  const loadMore = async () => {
    if (nextPage === null || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const response = await offersApi.list({
        ...buildSearchParams(params, latitude, longitude, city),
        page: nextPage,
      })
      setOffers((current) => [...current, ...response.results])
      setNextPage(response.next ? nextPage + 1 : null)
    } catch {
      setError('More results could not be loaded. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading || loadingMore || nextPage === null) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMoreRef.current()
    }, { rootMargin: '320px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadingMore, nextPage, offers.length])

  return (
    <div className="pb-24 sm:pb-8 max-w-5xl mx-auto px-4 pt-4">
      <SearchBox
        key={params.get('q') || ''}
        initialQuery={params.get('q') || ''}
        onSearch={(query) => update('q', query.trim() || null)}
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {latitude != null && longitude != null && <select
          aria-label="Filter by distance"
          value={params.get('radius_km') || ''}
          onChange={(event) => update('radius_km', event.target.value || null)}
          className="shrink-0 bg-canvas border border-border rounded-full px-3 py-1.5 text-xs"
        >
          <option value="">Any distance</option>
          <option value="5">Within 5 km</option>
          <option value="15">Within 15 km</option>
          <option value="30">Within 30 km</option>
        </select>}
        <select
          aria-label="Filter by tag"
          value={params.get('tag') || ''}
          onChange={(event) => update('tag', event.target.value || null)}
          className="shrink-0 bg-canvas border border-border rounded-full px-3 py-1.5 text-xs"
        >
          <option value="">All tags</option>
          {OFFER_TAGS.map((tag) => <option key={tag} value={tag}>{TAG_LABELS[tag] || tag}</option>)}
        </select>
        <select
          aria-label="Filter by category"
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
        <>
          <p className="mt-3 text-xs text-ink-soft" aria-live="polite">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'result' : 'results'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
            {!offers.length && !error && <p className="w-full py-10 text-center text-sm text-ink-soft">No offers match these filters yet.</p>}
          </div>
          {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>}
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          {nextPage !== null && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-6 block rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:border-teal disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more results'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
