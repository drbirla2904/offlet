import { Link } from 'react-router-dom'
import type { Offer } from '../types'
import { formatINR } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'

/** Prominent hero-style rail for Featured/Trending/Sponsored offers (the
 * `is_featured`/`is_trending`/`is_sponsored` flags an admin sets — see
 * backend `offers/admin.py`). Sponsored is labeled plainly, matching
 * ordinary marketplace ad-disclosure practice rather than blending it in. */
export function FeaturedCarousel({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null

  return (
    <section className="px-4 pt-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
        {offers.map((o) => (
          <Link
            key={o.id}
            to={`/offers/${o.id}`}
            className="relative shrink-0 w-[85%] sm:w-[420px] h-44 sm:h-52 rounded-3xl overflow-hidden snap-start"
          >
            {o.product_image ? (
              <img src={resolveMediaUrl(o.product_image)} alt={o.product_name} className="absolute inset-0 w-full h-full object-contain bg-canvas" />
            ) : (
              <div className="absolute inset-0 bg-canvas" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />

            {o.is_sponsored && (
              <span className="absolute top-3 right-3 bg-white/85 text-ink text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Sponsored
              </span>
            )}
            {!o.is_sponsored && o.is_trending && (
              <span className="absolute top-3 right-3 bg-white/85 text-marigold-dark text-[10px] font-semibold px-2 py-0.5 rounded-full">
                🔥 Trending
              </span>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="font-display text-lg font-semibold leading-tight line-clamp-1">{o.title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                {o.offer_price && <span className="font-display text-xl font-bold">{formatINR(o.offer_price)}</span>}
                {o.original_price && o.offer_price && (
                  <span className="text-xs text-white/70 line-through">{formatINR(o.original_price)}</span>
                )}
                {o.discount_percentage > 0 && (
                  <span className="bg-marigold text-white text-xs font-bold px-2 py-0.5 rounded-lg">{o.discount_percentage}% OFF</span>
                )}
              </div>
              <p className="text-xs text-white/80 mt-1">
                {o.business.name}
                {o.business.is_verified && ' ✓'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
