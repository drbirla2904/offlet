import { useEffect, useState } from 'react'
import { categoriesApi, offersApi, businessesApi } from '../api/endpoints'
import type { Category, Offer, Business } from '../types'
import { useLocationContext } from '../context/LocationContext'
import { OfferRail } from '../components/OfferCard'
import { BusinessRail } from '../components/BusinessCard'
import { CategoryChip } from '../components/CategoryChip'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { OfferRailSkeleton } from '../components/Skeletons'

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

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const geo = latitude != null && longitude != null
      ? { lat: latitude, lng: longitude, radius_km: 15 }
      : city ? { city } : {}
    setLoading(true)
    Promise.all([
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
        setFeatured(ft.results)
        setNearby(n.results)
        setFlash(f.results)
        setClearance(c.results)
        setUnder499(u.results)
        setBigDiscount(b.results)
        setNewOffers(nw.results)
        setPopularShops(shops.results)
      })
      .finally(() => setLoading(false))
  }, [latitude, longitude, city])

  const nothingToShow = !loading && !featured.length && !nearby.length && !flash.length && !clearance.length

  return (
    <div className="pb-20 sm:pb-8">
      {!loading && <FeaturedCarousel offers={featured} />}

      <div className="px-4 pt-4 overflow-x-auto no-scrollbar flex gap-3">
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
          <OfferRail title="Offers Near You" offers={nearby} viewAllHref="/search?ordering=distance&radius_km=15" />
          <OfferRail title="Flash Deals" offers={flash} />
          <OfferRail title="Clearance Sale" offers={clearance} />
          <OfferRail title="Under ₹499" offers={under499} />
          <OfferRail title="50%+ OFF" offers={bigDiscount} />
          <BusinessRail title="Popular Shops" businesses={popularShops} />
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
