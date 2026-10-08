import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, ExternalLink, MapPin, Phone, Printer, Share2, Store } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { businessesApi, categoriesApi, productsApi } from '../../api/endpoints'
import { useToast } from '../../context/ToastContext'
import type { Business, Category, Product } from '../../types'
import { createShopPosterImage } from '../../utils/shopPosterImage'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { formatCatalogProductPrice } from '../../utils/product'

export function ShopPosterPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogResult, setCatalogResult] = useState<{ businessId: string; products: Product[]; error: string } | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [loading, setLoading] = useState(true)
  const [imageBusy, setImageBusy] = useState(false)
  const [error, setError] = useState('')
  const qrRef = useRef<HTMLDivElement | null>(null)
  const { showToast } = useToast()

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

  useEffect(() => {
    if (!selectedBusinessId) return
    let active = true
    productsApi.list(Number(selectedBusinessId), 1)
      .then((response) => {
        if (active) {
          setCatalogResult({
            businessId: selectedBusinessId,
            products: response.results.filter((product) => product.is_active !== false).slice(0, 2),
            error: '',
          })
        }
      })
      .catch(() => {
        if (active) {
          setCatalogResult({
            businessId: selectedBusinessId,
            products: [],
            error: 'Catalog previews could not be loaded. The shop poster is still available.',
          })
        }
      })
    return () => { active = false }
  }, [selectedBusinessId])

  const business = businesses.find((shop) => String(shop.id) === selectedBusinessId)
  const products = catalogResult?.businessId === selectedBusinessId ? catalogResult.products : []
  const productsError = catalogResult?.businessId === selectedBusinessId ? catalogResult.error : ''
  const productsLoading = Boolean(selectedBusinessId && catalogResult?.businessId !== selectedBusinessId)
  const categoryName = categories.find((category) => category.id === business?.category)?.name || 'Local business'
  const storefrontUrl = business
    ? new URL(`/shops/${business.id}`, window.location.origin).toString()
    : ''

  const downloadPoster = (file: File) => {
    const downloadUrl = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${business?.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'shop'}-offlet-poster.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  const createPosterFile = async () => {
    const qrSvg = qrRef.current?.querySelector('svg')
    if (!business || !qrSvg) throw new Error('The shop poster is not ready yet. Please try again.')
    return createShopPosterImage({
      businessName: business.name,
      category: categoryName,
      location: [business.area, business.city].filter(Boolean).join(', '),
      phone: business.phone_number || '',
      storefrontUrl,
      qrSvg,
      products: products.map((product) => ({
        name: product.name,
        price: formatCatalogProductPrice(product),
        image: resolveMediaUrl(product.images?.find((item) => item.is_primary)?.image || product.images?.[0]?.image),
      })),
    })
  }

  const savePosterImage = async () => {
    if (imageBusy) return
    setImageBusy(true)
    try {
      downloadPoster(await createPosterFile())
      showToast('Poster image downloaded. It’s ready to post on Instagram.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export the poster image. Please try again.', 'error')
    } finally {
      setImageBusy(false)
    }
  }

  const sharePosterImage = async () => {
    if (imageBusy) return
    const shop = business
    if (!shop) {
      showToast('Select a shop before sharing its poster.', 'error')
      return
    }
    setImageBusy(true)
    try {
      const file = await createPosterFile()
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: `${shop.name} | OFFlet`,
          text: `Visit ${shop.name} on OFFlet`,
        })
      } else {
        downloadPoster(file)
        showToast('Image sharing isn’t supported here, so the poster was downloaded. Upload it to Instagram from your photos.', 'info')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      showToast(err instanceof Error ? err.message : 'Could not share the poster image. Please try downloading it instead.', 'error')
    } finally {
      setImageBusy(false)
    }
  }

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
          <p className="mt-1 text-sm text-ink-soft">A shop-first poster with your catalog, contact details and QR code.</p>
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
            onClick={() => void savePosterImage()}
            disabled={imageBusy || productsLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60"
          >
            <Download size={17} /> {productsLoading ? 'Loading catalog…' : imageBusy ? 'Preparing…' : 'Download PNG'}
          </button>
          <button
            type="button"
            onClick={() => void sharePosterImage()}
            disabled={imageBusy || productsLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
          >
            <Share2 size={17} /> {productsLoading ? 'Loading catalog…' : imageBusy ? 'Preparing…' : 'Share image'}
          </button>
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
            <div className="shop-poster-brand"><span className="shop-poster-mark">O</span> OFFlet <span className="shop-poster-brand-divider">FOR LOCAL SHOPS</span></div>
            <p className="shop-poster-eyebrow">GOOD THINGS ARE CLOSER THAN YOU THINK</p>
            <h2 className="shop-poster-heading">{business.name}</h2>
            <div className="shop-poster-shop-meta">
              <span className="shop-poster-category">{categoryName}</span>
              {(business.area || business.city) && (
                <span className="shop-poster-location"><MapPin size={13} /> {[business.area, business.city].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </header>

          <section className="shop-poster-products">
            <div className="shop-poster-section-heading">
              <div>
                <p className="shop-poster-label">PICKED FOR YOU</p>
                <h3>From our shelves</h3>
              </div>
              <span>Shop local · Shop on OFFlet</span>
            </div>
            {products.length ? (
              <div className="shop-poster-product-grid">
                {products.map((product) => {
                  const image = product.images?.find((item) => item.is_primary) || product.images?.[0]
                  return (
                    <div className="shop-poster-product" key={product.id}>
                      {image ? (
                        <img src={resolveMediaUrl(image.image)} alt="" />
                      ) : (
                        <div className="shop-poster-product-placeholder" aria-hidden="true">✦</div>
                      )}
                      <div className="shop-poster-product-copy">
                        <strong>{product.name}</strong>
                        <span>{formatCatalogProductPrice(product)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="shop-poster-product-empty">
                {productsLoading ? 'Loading catalog items…' : 'Discover our shop and ask us what’s in store.'}
              </div>
            )}
            {productsError && <p className="shop-poster-catalog-note">{productsError}</p>}
          </section>

          <section className="shop-poster-scan">
            <div className="shop-poster-scan-copy">
              <span className="shop-poster-scan-index">COME ON IN</span>
              <h3>Scan to explore<br />our shop</h3>
              <p>See more products, offers and details.</p>
              {(business.area || business.city) && (
                <div className="shop-poster-contact"><MapPin size={13} /><span>{[business.area, business.city].filter(Boolean).join(', ')}</span></div>
              )}
              {business.phone_number && (
                <div className="shop-poster-contact"><Phone size={15} /><span>{business.phone_number}</span></div>
              )}
            </div>
            <div ref={qrRef} className="shop-poster-qr-wrap">
              <QRCodeSVG
                value={storefrontUrl}
                size={220}
                level="H"
                marginSize={2}
                bgColor="#FFFFFF"
                fgColor="#153A36"
                aria-label={`QR code linking to ${business.name} on OFFlet`}
              />
              <span>SCAN TO EXPLORE</span>
            </div>
          </section>

          <footer className="shop-poster-footer">
            <div><strong>OFFlet</strong><span>Find your local favorite.</span></div>
            <a href={storefrontUrl}>OPEN SHOP ↗</a>
          </footer>
        </article>
      </div>

      <div className="poster-tools mt-4 flex items-center justify-between gap-3 text-xs text-ink-soft">
        <span>4:5 Instagram-ready PNG · QR destination: {storefrontUrl}</span>
        <a href={storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-teal">
          Preview shop <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}