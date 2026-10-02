import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, MapPin, Phone, Printer, Store } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { businessesApi, categoriesApi } from '../../api/endpoints'
import type { Business, Category } from '../../types'

export function ShopPosterPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([businessesApi.mine(), categoriesApi.list()])
      .then(([ownedBusinesses, availableCategories]) => {
        setBusinesses(ownedBusinesses)
        setCategories(availableCategories)
        setSelectedBusinessId(String(ownedBusinesses[0]?.id || ''))
      })
      .catch(() => setError('Your shop details could not be loaded. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const business = businesses.find((shop) => String(shop.id) === selectedBusinessId)
  const categoryName = categories.find((category) => category.id === business?.category)?.name || 'Local business'
  const storefrontUrl = business
    ? new URL(`/shops/${business.id}`, window.location.origin).toString()
    : ''

  if (loading) {
    return <p className="py-16 text-center text-sm text-ink-soft">Preparing your poster…</p>
  }

  if (error || !business) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Store size={28} className="mx-auto text-teal" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Poster unavailable</h1>
        <p className="mt-2 text-sm text-ink-soft">{error || 'Create a shop profile before generating its poster.'}</p>
        <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="poster-workspace mx-auto max-w-6xl px-4 pb-12 pt-6">
      <div className="poster-tools mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Shop poster</h1>
          <p className="mt-1 text-sm text-ink-soft">A print-ready storefront poster with your OFFlet QR code.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {businesses.length > 1 && (
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              Shop
              <select
                value={selectedBusinessId}
                onChange={(event) => setSelectedBusinessId(event.target.value)}
                className="h-10 max-w-52 rounded-xl border border-border bg-surface px-3 text-sm"
              >
                {businesses.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-marigold px-4 text-sm font-semibold text-white hover:bg-marigold-dark"
          >
            <Printer size={17} /> Print poster
          </button>
        </div>
      </div>

      <div className="poster-stage">
        <article id="print-poster" className="shop-poster" aria-label={`${business.name} OFFlet shop poster`}>
          <header className="shop-poster-top">
            <div className="shop-poster-brand"><span className="shop-poster-mark">O</span> OFFlet</div>
            <p className="shop-poster-eyebrow">YOUR NEIGHBORHOOD, BETTER CONNECTED</p>
            <p className="shop-poster-heading">Good finds.<br /><span>Right nearby.</span></p>
            <div className="shop-poster-rule" />
          </header>

          <section className="shop-poster-shop">
            <p className="shop-poster-label">VISIT OUR SHOP</p>
            <h2>{business.name}</h2>
            <span className="shop-poster-category">{categoryName}</span>
            {(business.area || business.city) && (
              <p className="shop-poster-location"><MapPin size={15} /> {[business.area, business.city].filter(Boolean).join(', ')}</p>
            )}
          </section>

          <section className="shop-poster-scan">
            <div className="shop-poster-scan-copy">
              <span className="shop-poster-scan-index">01 / DISCOVER</span>
              <h3>Scan to find<br />our shop on OFFlet</h3>
              <p>See our storefront, offers and the latest from our shop.</p>
              {business.phone_number && (
                <div className="shop-poster-contact"><Phone size={15} /><span>{business.phone_number}</span></div>
              )}
            </div>
            <div className="shop-poster-qr-wrap">
              <QRCodeSVG
                value={storefrontUrl}
                size={220}
                level="H"
                marginSize={2}
                bgColor="#FFFFFF"
                fgColor="#153A36"
                aria-label={`QR code linking to ${business.name} on OFFlet`}
              />
              <span>SCAN ME</span>
            </div>
          </section>

          <footer className="shop-poster-footer">
            <div><strong>OFFlet</strong><span>Find local. Shop better.</span></div>
            <a href={storefrontUrl}>{new URL(storefrontUrl).host}</a>
          </footer>
        </article>
      </div>

      <div className="poster-tools mt-4 flex items-center justify-between gap-3 text-xs text-ink-soft">
        <span>QR destination: {storefrontUrl}</span>
        <a href={storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-teal">
          Preview shop <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}