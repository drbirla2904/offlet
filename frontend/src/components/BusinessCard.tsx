import { Link } from 'react-router-dom'
import type { Business } from '../types'
import { formatDistance } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'

export function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      to={`/shops/${business.id}`}
      className="w-40 sm:w-48 shrink-0 bg-surface rounded-2xl border border-border p-3 flex flex-col items-center text-center hover:shadow-md transition-shadow"
    >
      <div className="w-16 h-16 rounded-full bg-canvas overflow-hidden flex items-center justify-center text-2xl mb-2">
        {business.logo ? <img src={resolveMediaUrl(business.logo)} alt={business.name} className="w-full h-full object-contain p-1" /> : '🏪'}
      </div>
      <p className="text-sm font-semibold text-ink line-clamp-1">
        {business.name}
        {business.is_verified && <span className="text-teal"> ✓</span>}
      </p>
      <p className="text-xs text-ink-soft mt-0.5">
        {business.rating_count > 0 ? `★ ${business.rating_average.toFixed(1)} (${business.rating_count})` : 'New shop'}
      </p>
      {business.distance_km != null && <p className="text-xs text-ink-soft">{formatDistance(business.distance_km)} away</p>}
    </Link>
  )
}

export function BusinessRail({ title, businesses }: { title: string; businesses: Business[] }) {
  if (!businesses.length) return null
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-semibold text-ink px-4 mb-2">{title}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </section>
  )
}
