import { useEffect, useState } from 'react'
import { ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { businessesApi, productsApi } from '../../api/endpoints'
import { ProductImageManager } from '../../components/ProductImageManager'
import type { Business, Product } from '../../types'
import { apiErrorMessage } from '../../utils/apiError'
import { resolveMediaUrl } from '../../utils/mediaUrl'

type CatalogForm = {
  name: string
  description: string
  brand: string
  pricing_mode: 'static' | 'dynamic'
  price: string
  price_min: string
  price_max: string
  price_note: string
}

const emptyForm: CatalogForm = {
  name: '',
  description: '',
  brand: '',
  pricing_mode: 'static',
  price: '',
  price_min: '',
  price_max: '',
  price_note: '',
}

const asPrice = (value: string) => value.trim() ? Number(value) : null

export function ShopkeeperCatalogManagerPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<CatalogForm>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    businessesApi.mine()
      .then((list) => {
        setBusinesses(list)
        if (list.length) setBusinessId(list[0].id)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your shops.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!businessId) {
      setProducts([])
      return
    }
    let active = true
    setLoading(true)
    productsApi.list(businessId)
      .then((result) => { if (active) setProducts(result.results) })
      .catch((err) => { if (active) setError(apiErrorMessage(err, 'Could not load catalog items.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [businessId])

  const refreshProducts = async () => {
    if (!businessId) return
    const result = await productsApi.list(businessId)
    setProducts(result.results)
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      brand: product.brand || '',
      pricing_mode: product.pricing_mode || 'static',
      price: product.price == null ? '' : String(product.price),
      price_min: product.price_min == null ? '' : String(product.price_min),
      price_max: product.price_max == null ? '' : String(product.price_max),
      price_note: product.price_note || '',
    })
    setImageFile(null)
    setError('')
    setNotice('')
  }

  const resetForm = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setImageFile(null)
    setError('')
    setNotice('')
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!businessId) return
    setSaving(true)
    setError('')
    setNotice('')

    const payload: Partial<Product> & { business?: number } = {
      business: businessId,
      name: form.name.trim(),
      description: form.description.trim(),
      brand: form.brand.trim(),
      pricing_mode: form.pricing_mode,
      price: form.pricing_mode === 'static' ? asPrice(form.price) : null,
      price_min: form.pricing_mode === 'dynamic' ? asPrice(form.price_min) : null,
      price_max: form.pricing_mode === 'dynamic' ? asPrice(form.price_max) : null,
      price_note: form.pricing_mode === 'dynamic' ? form.price_note.trim() : '',
    }

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload)
        if (imageFile) await productsApi.uploadImage(editingProduct.id, imageFile, editingProduct.images.length === 0)
        setNotice('Catalog item updated.')
      } else {
        const created = await productsApi.create(payload as Partial<Product> & { business: number })
        if (imageFile) await productsApi.uploadImage(created.id, imageFile, true)
        setNotice('Catalog item added.')
      }
      setEditingProduct(null)
      setForm(emptyForm)
      setImageFile(null)
      await refreshProducts()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this catalog item. Check the price fields and try again.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (product: Product) => {
    setError('')
    try {
      await productsApi.update(product.id, { is_active: !product.is_active })
      await refreshProducts()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update catalog visibility.'))
    }
  }

  const removeProduct = async (product: Product) => {
    if (!confirm(`Delete “${product.name}” from your catalog? This also removes its photos.`)) return
    setError('')
    try {
      await productsApi.remove(product.id)
      if (editingProduct?.id === product.id) resetForm()
      await refreshProducts()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete this catalog item.'))
    }
  }

  const displayPrice = (product: Product) => {
    if (product.display_price) return product.display_price
    const money = (value: number | string | null | undefined) => value == null ? null : `₹${Number(value).toLocaleString('en-IN')}`
    if (product.pricing_mode === 'static') return money(product.price) || 'Price on request'
    if (product.price_min != null && product.price_max != null) return `${money(product.price_min)} - ${money(product.price_max)}`
    return product.price_note || (product.price_min != null ? `From ${money(product.price_min)}` : 'Price on request')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-7 sm:pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Storefront inventory</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Manage catalog</h1>
          <p className="mt-1 text-sm text-ink-soft">List regular products and services separately from time-limited offers.</p>
        </div>
        {businesses.length > 1 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Shop
            <select value={businessId ?? ''} onChange={(event) => setBusinessId(Number(event.target.value))} className="min-w-52 border border-border bg-surface px-3 py-2 text-sm text-ink">
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <p role="alert" className="mb-4 border-l-2 border-red-500 pl-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 border-l-2 border-success pl-3 text-sm text-success">{notice}</p>}

      {businesses.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <section aria-label="Catalog items">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold text-ink">Items <span className="text-ink-soft">({products.length})</span></h2>
              <button type="button" onClick={resetForm} className="inline-flex h-9 items-center gap-2 bg-marigold px-3 text-sm font-semibold text-white hover:bg-marigold-dark">
                <Plus size={16} /> Add item
              </button>
            </div>
            {loading ? <p className="py-5 text-sm text-ink-soft">Loading catalog…</p> : (
              <div className="divide-y divide-border">
                {products.map((product) => {
                  const image = product.images?.find((item) => item.is_primary) || product.images?.[0]
                  return (
                    <article key={product.id} className="flex gap-3 py-4">
                      {image ? <img src={resolveMediaUrl(image.image)} alt="" className="h-16 w-16 shrink-0 object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-canvas text-ink-soft"><ImagePlus size={20} /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-ink">{product.name}</h3>
                          <span className={`text-[10px] font-bold uppercase ${product.is_active ? 'text-success' : 'text-ink-soft'}`}>{product.is_active ? 'Visible' : 'Hidden'}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink">{displayPrice(product)}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{product.description || product.brand || (product.pricing_mode === 'dynamic' ? 'Dynamic price' : 'Fixed price')}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                          <button type="button" onClick={() => startEdit(product)} className="inline-flex items-center gap-1 text-teal hover:underline"><Pencil size={13} /> Edit</button>
                          <button type="button" onClick={() => toggleVisibility(product)} className="text-ink-soft hover:text-ink">{product.is_active ? 'Hide' : 'Show'}</button>
                          <button type="button" onClick={() => removeProduct(product)} className="inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={13} /> Delete</button>
                        </div>
                      </div>
                    </article>
                  )
                })}
                {!products.length && <p className="py-8 text-sm text-ink-soft">Your catalog is empty. Add regular items customers can browse even when you have no active offers.</p>}
              </div>
            )}
          </section>

          <section className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">{editingProduct ? 'Edit item' : 'New catalog item'}</h2>
              {editingProduct && <button type="button" onClick={resetForm} aria-label="Cancel editing" className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>}
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Item name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={200} className="border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="e.g. Handmade ceramic vase" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Description
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="resize-y border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="Details customers should know" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Brand <span className="font-normal">Optional</span>
                <input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} maxLength={100} className="border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="Brand or maker" />
              </label>

              <fieldset>
                <legend className="mb-2 text-xs font-medium text-ink-soft">Pricing type</legend>
                <div className="grid grid-cols-2 border border-border">
                  {(['static', 'dynamic'] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setForm({ ...form, pricing_mode: mode })} aria-pressed={form.pricing_mode === mode} className={`min-h-10 px-2 text-sm font-semibold ${form.pricing_mode === mode ? 'bg-ink text-white' : 'bg-surface text-ink-soft'}`}>
                      {mode === 'static' ? 'Fixed price' : 'Variable price'}
                    </button>
                  ))}
                </div>
              </fieldset>

              {form.pricing_mode === 'static' ? (
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Price (INR)
                  <input type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="1499.00" />
                </label>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Minimum (INR)
                      <input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price_min} onChange={(event) => setForm({ ...form, price_min: event.target.value })} className="min-w-0 border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="Optional" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Maximum (INR)
                      <input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price_max} onChange={(event) => setForm({ ...form, price_max: event.target.value })} className="min-w-0 border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="Optional" />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Price note <span className="font-normal">Required if no range is set</span>
                    <input value={form.price_note} onChange={(event) => setForm({ ...form, price_note: event.target.value })} maxLength={200} className="border border-border bg-surface px-3 py-2.5 text-sm text-ink" placeholder="Starts at ₹2,499 or Price on request" />
                  </label>
                </>
              )}

              {!editingProduct && (
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">Photo <span className="font-normal">Optional</span>
                  <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="w-full text-sm text-ink-soft file:mr-3 file:border-0 file:bg-canvas file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink" />
                </label>
              )}
              {editingProduct && <ProductImageManager productId={editingProduct.id} />}

              <button disabled={saving || !businessId} className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 bg-marigold px-4 text-sm font-semibold text-white hover:bg-marigold-dark disabled:opacity-60">
                <Save size={16} /> {saving ? 'Saving…' : editingProduct ? 'Save changes' : 'Add to catalog'}
              </button>
            </form>
          </section>
        </div>
      )}

      {!loading && !businesses.length && <p className="border-l-2 border-amber pl-3 text-sm text-ink-soft">Set up a shop before adding catalog items.</p>}
    </div>
  )
}