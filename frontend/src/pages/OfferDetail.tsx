import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { businessesApi, conversationsApi, favoritesApi, offersApi, reportsApi } from '../api/endpoints'
import type { Business, Offer } from '../types'
import { formatDistance, formatINR, TAG_LABELS } from '../utils/format'
import { CountdownTimer } from '../components/CountdownTimer'
import { useGuest } from '../context/GuestContext'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { REPORT_REASONS } from '../utils/constants'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { getDirectionsUrl } from '../utils/directions'
import { useLocationContext } from '../context/LocationContext'
import { OfferRail } from '../components/OfferCard'
import { BusinessRail } from '../components/BusinessCard'

export function OfferDetail() {
  const { id } = useParams()
  const offerId = Number(id)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [relatedContent, setRelatedContent] = useState<{ offerId: number; offers: Offer[]; shops: Business[] } | null>(null)
  const [showReport, setShowReport] = useState(false)
  const { guestId, addRecentlyViewed } = useGuest()
  const requireAuth = useRequireAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { latitude, longitude, city } = useLocationContext()

  useEffect(() => {
    let active = true
    offersApi.retrieve(offerId).then((currentOffer) => {
      if (!active) return
      setOffer(currentOffer)
      addRecentlyViewed(offerId)
    }).catch((err) => {
      if (active) showToast(apiErrorMessage(err, 'Offer details could not be loaded.'), 'error')
    })
    offersApi.logView(offerId, guestId).catch(() => {})
    return () => { active = false }
  }, [offerId, guestId, addRecentlyViewed, showToast])

  useEffect(() => {
    if (!offer) return
    let active = true
    const geo = {
      lat: latitude ?? undefined,
      lng: longitude ?? undefined,
      radius_km: latitude != null && longitude != null ? 30 : undefined,
      city: latitude != null && longitude != null ? undefined : city || undefined,
    }
    Promise.allSettled([
      offersApi.list({
        ...geo,
        search: offer.product?.name || offer.product_name,
        ordering: latitude != null && longitude != null ? 'distance' : '-popular',
      }),
      businessesApi.list({
        ...geo,
        category: offer.business.category ?? undefined,
        page: 1,
      }),
    ]).then(([matchingOffers, shops]) => {
      if (!active) return
      let relatedOffers: Offer[] = []
      let relatedShops: Business[] = []
      if (matchingOffers.status === 'fulfilled') {
        relatedOffers = matchingOffers.value.results.filter((item) => item.id !== offer.id).slice(0, 10)
      } else {
        showToast(apiErrorMessage(matchingOffers.reason, 'Related offers could not be loaded.'), 'error')
      }
      if (shops.status === 'fulfilled') {
        relatedShops = shops.value.results.filter((shop) => shop.id !== offer.business.id).slice(0, 10)
      } else {
        showToast(apiErrorMessage(shops.reason, 'Nearby shops could not be loaded.'), 'error')
      }
      setRelatedContent({ offerId: offer.id, offers: relatedOffers, shops: relatedShops })
    })
    return () => { active = false }
  }, [offer, latitude, longitude, city, showToast])

  if (!offer || offer.id !== offerId) return <p className="text-center text-ink-soft py-10 text-sm">Loading…</p>

  const business = offer.business
  const images = offer.product?.images?.length ? offer.product.images : []
  const relatedOffers = relatedContent?.offerId === offer.id ? relatedContent.offers : []
  const relatedShops = relatedContent?.offerId === offer.id ? relatedContent.shops : []

  const call = () => {
    offersApi.interact(offer.id, 'call', guestId).catch(() => {})
    window.location.href = `tel:${business.phone_number}`
  }
  const whatsapp = () => {
    offersApi.interact(offer.id, 'whatsapp', guestId).catch(() => {})
    window.open(`https://wa.me/91${business.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in "${offer.title}"`)}`, '_blank')
  }
  const directions = () => {
    offersApi.interact(offer.id, 'directions', guestId).catch(() => {})
    window.open(getDirectionsUrl(business), '_blank', 'noopener,noreferrer')
  }
  const save = requireAuth(async () => {
    try {
      await favoritesApi.add(offer.id)
      setOffer({ ...offer, is_favorited: true })
      showToast('Saved to your favorites', 'success')
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't save this offer — please try again."), 'error')
    }
  }, 'Create a free account to save offers and follow this shop.')
  const share = () => {
    offersApi.interact(offer.id, 'share', guestId).catch(() => {})
    const url = window.location.href
    if (navigator.share) navigator.share({ title: offer.title, url }).catch(() => {})
    else navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard', 'success')).catch(() => {})
  }
  const chat = requireAuth(async () => {
    const conv = await conversationsApi.create({ business: business.id, offer: offer.id })
    navigate(`/account/messages/${conv.id}`)
  }, 'Login to contact this shopkeeper and keep your conversation history.')

  const submitReport = requireAuth(async (reason: string) => {
    try {
      await reportsApi.create({ offer: offer.id, reason })
      setShowReport(false)
      showToast("Thanks — our team will review this offer.", 'success')
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't submit your report — please try again."), 'error')
    }
  }, 'Login required to report an offer.')

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto">
      <div className="h-64 sm:h-80 bg-canvas">
        {(images[0]?.image || offer.product_image) ? (
          <img src={resolveMediaUrl(images[0]?.image || offer.product_image)} alt={offer.product_name} className="w-full h-full object-contain bg-surface" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🏷️</div>
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {offer.tags.map((t) => (
            <span key={t} className="bg-marigold-soft text-marigold-dark text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {TAG_LABELS[t] || t}
            </span>
          ))}
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink">{offer.title}</h1>
        <p className="text-ink-soft text-sm mt-1">{offer.product_name}</p>

        <div className="flex items-baseline gap-3 mt-3">
          {offer.offer_price && <span className="font-display text-3xl font-bold text-ink">{formatINR(offer.offer_price)}</span>}
          {offer.original_price && offer.offer_price && (
            <span className="text-base text-ink-soft line-through">{formatINR(offer.original_price)}</span>
          )}
          {offer.discount_percentage > 0 && (
            <span className="bg-marigold text-white text-sm font-bold px-2.5 py-1 rounded-lg">{offer.discount_percentage}% OFF</span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-sm">
          {offer.is_sold_out ? (
            <span className="text-red-600 font-semibold">SOLD OUT</span>
          ) : offer.available_stock != null ? (
            <span className="text-amber font-semibold">Only {offer.available_stock} left</span>
          ) : null}
          <CountdownTimer secondsRemaining={offer.seconds_remaining} />
        </div>

        {offer.custom_description && <p className="text-sm text-ink-soft mt-3">{offer.custom_description}</p>}
        {offer.product?.description && <p className="text-sm text-ink-soft mt-3">{offer.product.description}</p>}

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={call} className="bg-marigold text-white rounded-xl py-2.5 text-sm font-semibold">📞 Call Shop</button>
          <button onClick={whatsapp} className="bg-success text-white rounded-xl py-2.5 text-sm font-semibold">💬 WhatsApp</button>
          <button onClick={directions} className="bg-canvas border border-border rounded-xl py-2.5 text-sm font-semibold text-ink">🧭 Directions</button>
          <button onClick={chat} className="bg-canvas border border-border rounded-xl py-2.5 text-sm font-semibold text-ink">💭 Chat with Shop</button>
          <button onClick={save} className="bg-canvas border border-border rounded-xl py-2.5 text-sm font-semibold text-ink">
            {offer.is_favorited ? '❤️ Saved' : '🤍 Save Offer'}
          </button>
          <button onClick={share} className="bg-canvas border border-border rounded-xl py-2.5 text-sm font-semibold text-ink">↗ Share</button>
        </div>
        <button onClick={() => setShowReport(true)} className="text-xs text-ink-soft mt-3 underline">
          Report this offer
        </button>

        <div className="mt-6 border-t border-border pt-4">
          <a href={`/shops/${business.id}`} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-canvas overflow-hidden flex items-center justify-center text-xl">
              {business.logo ? <img src={resolveMediaUrl(business.logo)} alt={`${business.name} logo`} className="w-full h-full object-contain p-1" /> : '🏪'}
            </div>
            <div>
              <p className="font-semibold text-ink text-sm">
                {business.name} {business.is_verified && <span className="text-teal">✓ Verified</span>}
              </p>
              <p className="text-xs text-ink-soft">
                {business.area}, {business.city} {offer.distance_km != null && `· ${formatDistance(offer.distance_km)}`}
              </p>
            </div>
          </a>
        </div>
      </div>

      <OfferRail
        title="More like this"
        subtitle="Related products and offers from nearby shops"
        offers={relatedOffers}
      />
      <BusinessRail
        title="More shops nearby"
        subtitle="Explore local shops in this category"
        businesses={relatedShops}
      />

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl p-6">
            <h3 className="font-display text-lg font-semibold mb-3">Report this offer</h3>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => submitReport(r.value)}
                  className="text-left text-sm px-3 py-2 rounded-lg hover:bg-canvas"
                >
                  {r.label}
                </button>
              ))}
              <button onClick={() => setShowReport(false)} className="text-sm text-ink-soft mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
