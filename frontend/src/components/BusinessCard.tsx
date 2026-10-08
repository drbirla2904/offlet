import { Link } from 'react-router-dom'
import type { Business } from '../types'
import { formatDistance } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { HorizontalRail } from './HorizontalRail'

export function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      to={`/shops/${business.id}`}
      className="flex w-[68vw] max-w-60 shrink-0 snap-start flex-col items-center rounded-2xl border border-border bg-surface p-4 text-center transition-shadow hover:shadow-md sm:w-48"
    >
      <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-canvas text-2xl">
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
      {(business.area || business.city) && <p className="mt-1 max-w-full truncate text-[11px] text-ink-soft">{[business.area, business.city].filter(Boolean).join(', ')}</p>}
    </Link>
  )
}

export function BusinessRail({
  title,
  businesses,
  subtitle,
  viewAllHref,
}: {
  title: string
  businesses: Business[]
  subtitle?: string
  viewAllHref?: string
}) {
  if (!businesses.length) return null
  return (
    <HorizontalRail title={title} subtitle={subtitle} viewAllHref={viewAllHref} ariaLabel={title}>
      {businesses.map((business) => <BusinessCard key={business.id} business={business} />)}
    </HorizontalRail>
  )
}
