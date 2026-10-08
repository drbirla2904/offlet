import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { businessesApi, conversationsApi, followsApi, offersApi, productsApi, reviewsApi } from '../api/endpoints'
import type { Business, Offer, Product, Review } from '../types'
import { OfferCard } from '../components/OfferCard'
import { CatalogProductCard } from '../components/CatalogProductCard'
import { BusinessRail } from '../components/BusinessCard'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { formatDistance } from '../utils/format'
import { useToast } from '../context/ToastContext'
import { useLocationContext } from '../context/LocationContext'
import { apiErrorMessage } from '../utils/apiError'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { getDirectionsUrl } from '../utils/directions'
import { formatCatalogProductPrice } from '../utils/product'

export function BusinessProfile() {
  const { id } = useParams()
  const businessId = Number(id)
  const [business, setBusiness] = useState<Business | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerCount, setOfferCount] = useState(0)
  const [offerNextPage, setOfferNextPage] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<Product[]>([])
  const [catalogCount, setCatalogCount] = useState(0)
  const [catalogNextPage, setCatalogNextPage] = useState<number | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedShops, setRelatedShops] = useState<Business[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [startingChatProductId, setStartingChatProductId] = useState<number | null>(null)
  const productDialogRef = useRef<HTMLDialogElement | null>(null)
  const [tab, setTab] = useState<'offers' | 'catalog' | 'reviews'>('offers')
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const requireAuth = useRequireAuth()
  const { showToast } = useToast()
  const { latitude, longitude, city } = useLocationContext()
  const navigate = useNavigate()
  const currentBusinessId = business?.id
  const currentBusinessCategory = business?.category
  const currentBusinessCity = business?.city

  const load = () => {
    businessesApi.retrieve(businessId).then(setBusiness)
    offersApi.list({ business: businessId, page: 1 }).then((r) => {
      setOffers(r.results)
      setOfferCount(r.count)
      setOfferNextPage(r.next ? 2 : null)
    })
    productsApi.list(businessId, 1).then((r) => {
      setCatalog(r.results)
      setCatalogCount(r.count)
      setCatalogNextPage(r.next ? 2 : null)
    })
    reviewsApi.list(businessId).then((r) => setReviews(r.results))
  }

  useEffect(load, [businessId])

  useEffect(() => {
    if (selectedProduct && productDialogRef.current && !productDialogRef.current.open) {
      productDialogRef.current.showModal()
    }
  }, [selectedProduct])

  useEffect(() => {
    if (currentBusinessId == null) return
    let active = true
    businessesApi.list({
      category: currentBusinessCategory ?? undefined,
      lat: latitude ?? undefined,
      lng: longitude ?? undefined,
      radius_km: latitude != null && longitude != null ? 30 : undefined,
      city: latitude != null && longitude != null ? undefined : city || currentBusinessCity,
      page: 1,
    })
      .then((response) => {
        if (active) setRelatedShops(response.results.filter((shop) => shop.id !== currentBusinessId).slice(0, 10))
      })
      .catch((err) => {
        if (active) showToast(apiErrorMessage(err, 'Related nearby shops could not be loaded.'), 'error')
      })
    return () => { active = false }
  }, [currentBusinessId, currentBusinessCategory, currentBusinessCity, latitude, longitude, city, showToast])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      if (tab === 'offers' && offerNextPage !== null) {
        const response = await offersApi.list({ business: businessId, page: offerNextPage })
        setOffers((current) => [...current, ...response.results])
        setOfferNextPage(response.next ? offerNextPage + 1 : null)
      } else if (tab === 'catalog' && catalogNextPage !== null) {
        const response = await productsApi.list(businessId, catalogNextPage)
        setCatalog((current) => [...current, ...response.results])
        setCatalogNextPage(response.next ? catalogNextPage + 1 : null)
      }
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not load more items from this shop.'), 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  useEffect(() => {
    const nextPage = tab === 'offers' ? offerNextPage : tab === 'catalog' ? catalogNextPage : null
    const sentinel = sentinelRef.current
    if (!sentinel || loadingMore || nextPage === null) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMoreRef.current()
    }, { rootMargin: '320px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [tab, loadingMore, offerNextPage, catalogNextPage, offers.length, catalog.length])

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

  const startProductChat = requireAuth(async (product: Product) => {
    if (!business || startingChatProductId !== null) return
    setStartingChatProductId(product.id)
    try {
      const conversation = await conversationsApi.create({ business: business.id, product: product.id })
      try {
        await conversationsApi.sendMessage(
          conversation.id,
          `Hi, I'm interested in ${product.name}. Is it available?`,
        )
      } catch (err) {
        showToast(apiErrorMessage(err, 'The chat was opened, but your message could not be sent.'), 'error')
        setSelectedProduct(null)
        navigate(`/account/messages/${conversation.id}`)
        return
      }
      setSelectedProduct(null)
      navigate(`/account/messages/${conversation.id}`)
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not start a chat with this shop.'), 'error')
    } finally {
      setStartingChatProductId(null)
    }
  }, 'Log in to chat with this shop about a product.')

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
            href={getDirectionsUrl(business)}
            target="_blank" rel="noreferrer"
            className="bg-canvas border border-border rounded-xl py-2.5 text-center font-semibold text-ink col-span-2"
          >
            🧭 Get Directions · {business.address_line}, {business.area}, {business.city}
            {business.distance_km != null && ` (${formatDistance(business.distance_km)})`}
          </a>
        </div>

        <div aria-label="Shop content" className="-mx-4 mt-6 flex gap-5 overflow-x-auto border-b border-border px-4 text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button aria-pressed={tab === 'offers'} onClick={() => setTab('offers')} className={`shrink-0 whitespace-nowrap pb-2 ${tab === 'offers' ? 'border-b-2 border-marigold text-marigold' : 'text-ink-soft'}`}>
            Active Offers ({offerCount})
          </button>
          <button aria-pressed={tab === 'catalog'} onClick={() => setTab('catalog')} className={`shrink-0 whitespace-nowrap pb-2 ${tab === 'catalog' ? 'border-b-2 border-marigold text-marigold' : 'text-ink-soft'}`}>
            Catalog ({catalogCount})
          </button>
          <button aria-pressed={tab === 'reviews'} onClick={() => setTab('reviews')} className={`shrink-0 whitespace-nowrap pb-2 ${tab === 'reviews' ? 'border-b-2 border-marigold text-marigold' : 'text-ink-soft'}`}>
            Reviews ({reviews.length})
          </button>
        </div>

        {tab === 'offers' ? (
          <div className="flex flex-wrap gap-3 mt-4">
            {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
            {!offers.length && <p className="text-sm text-ink-soft">No active offers right now — check back soon.</p>}
            {offerNextPage !== null && <div ref={sentinelRef} className="h-1 basis-full" aria-hidden="true" />}
            {offerNextPage !== null && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="basis-full py-2 text-sm font-semibold text-teal disabled:opacity-60">{loadingMore ? 'Loading more offers…' : 'Load more offers'}</button>}
          </div>
        ) : tab === 'catalog' ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {catalog.map((item) => {
              return (
                <CatalogProductCard
                  key={item.id}
                  product={item}
                  startingChat={startingChatProductId === item.id}
                  onViewDetails={setSelectedProduct}
                  onChat={startProductChat}
                />
              )
            })}
            {!catalog.length && <p className="col-span-full text-sm text-ink-soft">No catalog items listed yet — the shopkeeper hasn’t added any products here.</p>}
            {catalogNextPage !== null && <div ref={sentinelRef} className="col-span-full h-1" aria-hidden="true" />}
            {catalogNextPage !== null && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="col-span-full py-2 text-sm font-semibold text-teal disabled:opacity-60">{loadingMore ? 'Loading more items…' : 'Load more items'}</button>}
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
      <BusinessRail
        title="More shops nearby"
        subtitle={business.category ? 'Discover other shops in this category' : 'Explore more local shops'}
        businesses={relatedShops}
      />
      {selectedProduct && (
        <dialog
          ref={productDialogRef}
          className="fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-ink/60"
          aria-labelledby="catalog-product-title"
          onClose={() => setSelectedProduct(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) productDialogRef.current?.close()
          }}
        >
          <div className="relative mx-auto my-auto max-h-[min(88vh,760px)] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => productDialogRef.current?.close()}
              aria-label="Close product details"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow"
            >
              <X size={20} aria-hidden="true" />
            </button>
            {(() => {
              const image = selectedProduct.images?.find((item) => item.is_primary) || selectedProduct.images?.[0]
              return image ? (
                <img src={resolveMediaUrl(image.image)} alt={selectedProduct.name} className="max-h-80 w-full bg-canvas object-contain" />
              ) : (
                <div className="flex h-56 items-center justify-center bg-canvas text-6xl" aria-hidden="true">🛍️</div>
              )
            })()}
            <div className="p-5">
              {selectedProduct.brand && <p className="text-xs font-semibold uppercase tracking-wide text-teal">{selectedProduct.brand}</p>}
              <h2 id="catalog-product-title" className="mt-1 font-display text-2xl font-semibold text-ink">{selectedProduct.name}</h2>
              <p className="mt-2 text-xl font-bold text-ink">{formatCatalogProductPrice(selectedProduct)}</p>
              {selectedProduct.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-soft">{selectedProduct.description}</p>}
              <button
                type="button"
                onClick={() => startProductChat(selectedProduct)}
                disabled={startingChatProductId !== null}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-wait disabled:opacity-60"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {startingChatProductId === selectedProduct.id ? 'Opening chat…' : `Chat with ${business.name}`}
              </button>
              <p className="mt-2 text-center text-xs text-ink-soft">Your message will mention this item.</p>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
