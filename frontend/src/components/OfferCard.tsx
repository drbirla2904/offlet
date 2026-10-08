import { Link } from 'react-router-dom'
import type { Offer } from '../types'
import { formatDistance, formatINR, TAG_LABELS } from '../utils/format'
import { CountdownTimer } from './CountdownTimer'
import { favoritesApi, offersApi } from '../api/endpoints'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { useGuest } from '../context/GuestContext'
import { useToast } from '../context/ToastContext'
import { useState } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { HorizontalRail } from './HorizontalRail'

export function OfferCard({
  offer,
  onFavoriteChange,
  className,
}: {
  offer: Offer
  onFavoriteChange?: () => void
  className?: string
}) {
  const requireAuth = useRequireAuth()
  const { guestId } = useGuest()
  const { showToast } = useToast()
  const [favorited, setFavorited] = useState(offer.is_favorited)
  const [busy, setBusy] = useState(false)

  const toggleFavorite = requireAuth(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      if (!favorited) {
        await favoritesApi.add(offer.id)
        setFavorited(true)
        showToast('Saved to your favorites', 'success')
      } else {
        await favoritesApi.removeByOffer(offer.id)
        setFavorited(false)
      }
      onFavoriteChange?.()
    } catch (err) {
      showToast('Something went wrong — please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }, 'Create a free account to save offers and get notified before they expire.')

  const share = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    offersApi.interact(offer.id, 'share', guestId).catch(() => {})
    const url = `${window.location.origin}/offers/${offer.id}`
    if (navigator.share) {
      navigator.share({ title: offer.title, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard', 'success')).catch(() => {})
    }
  }

  const primaryTag = offer.tags[0]

  return (
    <Link
      to={`/offers/${offer.id}`}
      className={`block w-[72vw] max-w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-md sm:w-56 ${className || ''}`}
    >
      <div className="relative h-36 bg-canvas sm:h-40">
        {offer.product_image ? (
          <img src={resolveMediaUrl(offer.product_image)} alt={offer.product_name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft text-3xl">🏷️</div>
        )}
        {offer.discount_percentage > 0 && (
          <div className="tag-notch absolute bottom-0 left-0 bg-marigold text-white text-xs font-bold px-3 py-1.5">
            {offer.discount_percentage}% OFF
          </div>
        )}
        {primaryTag && (
          <span className="absolute top-2 left-2 bg-ink/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {TAG_LABELS[primaryTag] || primaryTag}
          </span>
        )}
        <button
          onClick={toggleFavorite}
          aria-label="Save offer"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-sm"
        >
          {favorited ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold text-ink line-clamp-1">{offer.product_name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          {offer.offer_price && (
            <span className="font-display text-lg font-semibold text-ink">{formatINR(offer.offer_price)}</span>
          )}
          {offer.original_price && offer.offer_price && (
            <span className="text-xs text-ink-soft line-through">{formatINR(offer.original_price)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-soft mt-1.5">
          <span className="truncate min-w-0">
            {offer.business.name}
            {offer.business.is_verified && ' ✓'}
          </span>
          {offer.distance_km != null && <span className="shrink-0">· {formatDistance(offer.distance_km)}</span>}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          {offer.is_sold_out ? (
            <span className="text-red-600 font-semibold">SOLD OUT</span>
          ) : offer.available_stock != null && offer.available_stock <= 5 ? (
            <span className="text-amber font-semibold">Only {offer.available_stock} left</span>
          ) : (
            <span />
          )}
          <button onClick={share} className="text-ink-soft" aria-label="Share offer">
            ↗
          </button>
        </div>
        {offer.seconds_remaining != null && (
          <CountdownTimer secondsRemaining={offer.seconds_remaining} className="text-[11px] block mt-1" />
        )}
      </div>
    </Link>
  )
}

export function OfferRail({
  title,
  offers,
  subtitle,
  viewAllHref,
}: {
  title: string
  offers: Offer[]
  subtitle?: string
  viewAllHref?: string
}) {
  if (!offers.length) return null
  return (
    <HorizontalRail title={title} subtitle={subtitle} viewAllHref={viewAllHref} ariaLabel={title}>
      {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
    </HorizontalRail>
  )
}
