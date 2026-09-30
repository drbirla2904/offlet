import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { businessesApi, followsApi, offersApi, reviewsApi } from '../api/endpoints'
import type { Business, Offer, Review } from '../types'
import { OfferCard } from '../components/OfferCard'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { formatDistance } from '../utils/format'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'
import { resolveMediaUrl } from '../utils/mediaUrl'

export function BusinessProfile() {
  const { id } = useParams()
  const businessId = Number(id)
  const [business, setBusiness] = useState<Business | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [tab, setTab] = useState<'offers' | 'reviews'>('offers')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const requireAuth = useRequireAuth()
  const { showToast } = useToast()

  const load = () => {
    businessesApi.retrieve(businessId).then(setBusiness)
    offersApi.list({ business: businessId }).then((r) => setOffers(r.results))
    reviewsApi.list(businessId).then((r) => setReviews(r.results))
  }

  useEffect(load, [businessId])

  const toggleFollow = requireAuth(async () => {
    if (!business) return
    try {
      if (!business.is_following) {
        await followsApi.add(business.id)
        setBusiness({ ...business, is_following: true, follower_count: business.follower_count + 1 })
        showToast(`Following ${business.name}`, 'success')
      } else {
        await followsApi.removeByBusiness(business.id)
        setBusiness({ ...business, is_following: false, follower_count: Math.max(business.follower_count - 1, 0) })
      }
    } catch (err) {
      showToast(apiErrorMessage(err), 'error')
    }
  }, 'Create a free account to follow this shop and get notified of new offers.')

  const submitReview = requireAuth(async () => {
    try {
      await reviewsApi.create({ business: businessId, rating: reviewRating, comment: reviewText })
      setReviewText('')
      reviewsApi.list(businessId).then((r) => setReviews(r.results))
      showToast('Review posted', 'success')
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't post your review — please try again."), 'error')
    }
  }, 'Login to leave a review for this shop.')

  if (!business) return <p className="text-center text-ink-soft py-10 text-sm">Loading…</p>

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto">
      <div className="h-40 bg-canvas" />
      <div className="px-4 -mt-10">
        <div className="w-20 h-20 rounded-2xl bg-surface border-4 border-surface overflow-hidden flex items-center justify-center text-3xl shadow">
          {business.logo ? <img src={resolveMediaUrl(business.logo)} alt={`${business.name} logo`} className="w-full h-full object-contain p-1" /> : '🏪'}
        </div>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-ink line-clamp-2">
              {business.name} {business.is_verified && <span className="text-teal text-lg">✓</span>}
            </h1>
            <p className="text-sm text-ink-soft">
              {business.rating_count > 0 ? `★ ${business.rating_average.toFixed(1)} (${business.rating_count} reviews)` : 'New on LocalOffers'}
              {' · '}{business.follower_count} followers
            </p>
          </div>
          <button
            onClick={toggleFollow}
            className={`px-4 py-2 rounded-full text-sm font-semibold shrink-0 ${business.is_following ? 'bg-canvas border border-border text-ink' : 'bg-marigold text-white'}`}
          >
            {business.is_following ? 'Following' : 'Follow'}
          </button>
        </div>

        {business.description && <p className="text-sm text-ink-soft mt-3">{business.description}</p>}

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <a href={`tel:${business.phone_number}`} className="bg-marigold text-white rounded-xl py-2.5 text-center font-semibold">📞 Call</a>
          <a
            href={`https://wa.me/91${business.whatsapp_number?.replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            className="bg-success text-white rounded-xl py-2.5 text-center font-semibold"
          >
            💬 WhatsApp
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`}
            target="_blank" rel="noreferrer"
            className="bg-canvas border border-border rounded-xl py-2.5 text-center font-semibold text-ink col-span-2"
          >
            🧭 Get Directions · {business.address_line}, {business.area}, {business.city}
            {business.distance_km != null && ` (${formatDistance(business.distance_km)})`}
          </a>
        </div>

        <div className="flex gap-4 mt-6 border-b border-border text-sm font-medium">
          <button onClick={() => setTab('offers')} className={`pb-2 ${tab === 'offers' ? 'text-marigold border-b-2 border-marigold' : 'text-ink-soft'}`}>
            Active Offers ({offers.length})
          </button>
          <button onClick={() => setTab('reviews')} className={`pb-2 ${tab === 'reviews' ? 'text-marigold border-b-2 border-marigold' : 'text-ink-soft'}`}>
            Reviews ({reviews.length})
          </button>
        </div>

        {tab === 'offers' ? (
          <div className="flex flex-wrap gap-3 mt-4">
            {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
            {!offers.length && <p className="text-sm text-ink-soft">No active offers right now — check back soon.</p>}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="bg-canvas rounded-xl p-3">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)} className={n <= reviewRating ? 'text-marigold' : 'text-border'}>★</button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this shop…"
                className="w-full bg-surface border border-border rounded-lg p-2 text-sm"
                rows={2}
              />
              <button onClick={submitReview} className="mt-2 bg-marigold text-white rounded-full px-4 py-1.5 text-sm font-semibold">
                Post Review
              </button>
            </div>
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-border pb-3">
                <p className="text-sm font-semibold text-ink">{r.user_name} <span className="text-marigold">{'★'.repeat(r.rating)}</span></p>
                <p className="text-sm text-ink-soft mt-0.5">{r.comment}</p>
              </div>
            ))}
            {!reviews.length && <p className="text-sm text-ink-soft">No reviews yet — be the first.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
