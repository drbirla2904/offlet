import { useEffect, useState } from 'react'
import { categoriesApi, offersApi, businessesApi } from '../api/endpoints'
import type { Category, Offer, Business } from '../types'
import { useLocationContext } from '../context/LocationContext'
import { OfferRail } from '../components/OfferCard'
import { BusinessRail } from '../components/BusinessCard'
import { CategoryChip } from '../components/CategoryChip'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { OfferRailSkeleton } from '../components/Skeletons'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'

export function Home() {
  const { latitude, longitude, city } = useLocationContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Offer[]>([])
  const [nearby, setNearby] = useState<Offer[]>([])
  const [flash, setFlash] = useState<Offer[]>([])
  const [clearance, setClearance] = useState<Offer[]>([])
  const [under499, setUnder499] = useState<Offer[]>([])
  const [bigDiscount, setBigDiscount] = useState<Offer[]>([])
  const [newOffers, setNewOffers] = useState<Offer[]>([])
  const [popularShops, setPopularShops] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch((err) => {
      showToast(apiErrorMessage(err, 'Categories could not be loaded.'), 'error')
    })
  }, [showToast])

  useEffect(() => {
    const geo = latitude != null && longitude != null
      ? { lat: latitude, lng: longitude, radius_km: 15 }
      : city ? { city } : {}
    setLoading(true)
    Promise.allSettled([
      offersApi.list({ ...geo, promoted: true, ordering: '-created_at' }),
      offersApi.list({ ...geo, ordering: 'distance' }),
      offersApi.list({ ...geo, offer_type: 'flash_sale' }),
      offersApi.list({ ...geo, offer_type: 'clearance' }),
      offersApi.list({ ...geo, max_price: 499 }),
      offersApi.list({ ...geo, min_discount: 50, ordering: '-discount' }),
      offersApi.list({ ...geo, ordering: '-created_at' }),
      businessesApi.list({ ...geo, city: latitude ? undefined : city }),
    ])
      .then(([ft, n, f, c, u, b, nw, shops]) => {
        if (ft.status === 'fulfilled') setFeatured(ft.value.results)
        else showToast(apiErrorMessage(ft.reason, 'Featured offers could not be loaded.'), 'error')
        if (n.status === 'fulfilled') setNearby(n.value.results)
        else showToast(apiErrorMessage(n.reason, 'Nearby offers could not be loaded.'), 'error')
        if (f.status === 'fulfilled') setFlash(f.value.results)
        else showToast(apiErrorMessage(f.reason, 'Flash deals could not be loaded.'), 'error')
        if (c.status === 'fulfilled') setClearance(c.value.results)
        else showToast(apiErrorMessage(c.reason, 'Clearance offers could not be loaded.'), 'error')
        if (u.status === 'fulfilled') setUnder499(u.value.results)
        else showToast(apiErrorMessage(u.reason, 'Budget offers could not be loaded.'), 'error')
        if (b.status === 'fulfilled') setBigDiscount(b.value.results)
        else showToast(apiErrorMessage(b.reason, 'Discounted offers could not be loaded.'), 'error')
        if (nw.status === 'fulfilled') setNewOffers(nw.value.results)
        else showToast(apiErrorMessage(nw.reason, 'Recently added offers could not be loaded.'), 'error')
        if (shops.status === 'fulfilled') setPopularShops(shops.value.results)
        else showToast(apiErrorMessage(shops.reason, 'Nearby shops could not be loaded.'), 'error')
      })
      .finally(() => setLoading(false))
  }, [latitude, longitude, city, showToast])

  const nothingToShow = !loading && !featured.length && !nearby.length && !flash.length && !clearance.length

  return (
    <div className="pb-20 sm:pb-8">
      {!loading && <FeaturedCarousel offers={featured} />}

      <div aria-label="Browse categories" className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <CategoryChip key={c.id} category={c} />
        ))}
      </div>

      {loading ? (
        <>
          <OfferRailSkeleton title="Offers Near You" />
          <OfferRailSkeleton title="Flash Deals" />
          <OfferRailSkeleton title="Clearance Sale" />
        </>
      ) : (
        <>
          <OfferRail
            title="Offers Near You"
            subtitle={latitude != null && longitude != null ? 'Fresh finds around your current location' : `Local picks in ${city}`}
            offers={nearby}
            viewAllHref="/search?ordering=distance&radius_km=15"
          />
          <BusinessRail
            title="Shops Near You"
            subtitle={latitude != null && longitude != null ? 'Explore local stores around you' : `Discover stores in ${city}`}
            businesses={popularShops}
          />
          <OfferRail title="Flash Deals" subtitle="Limited-time prices from neighborhood shops" offers={flash} />
          <OfferRail title="Clearance Sale" offers={clearance} />
          <OfferRail title="Under ₹499" offers={under499} />
          <OfferRail title="50%+ OFF" offers={bigDiscount} />
          <OfferRail title="Recently Added" offers={newOffers} />
        </>
      )}

      {nothingToShow && (
        <div className="text-center py-16 px-6">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-display text-lg font-semibold text-ink">No local offers here yet</p>
          <p className="text-sm text-ink-soft mt-1">
            Try widening your area, or check back soon — new shops join every day.
          </p>
        </div>
      )}
    </div>
  )
}
