import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { businessesApi, categoriesApi, offersApi, productsApi } from '../../api/endpoints'
import type { Business, Category } from '../../types'
import { OFFER_TAGS, OFFER_TYPES } from '../../utils/constants'
import { ProductImageManager } from '../../components/ProductImageManager'
import { apiErrorMessage } from '../../utils/apiError'

/** Create (or edit) an offer in under a minute (product info + offer pricing
 * in one screen). Discount % is computed server-side — this form only shows
 * a live preview of it. */
export function ShopkeeperOfferFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([])
  const [businessId, setBusinessId] = useState<number | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [productId, setProductId] = useState<number | null>(null)

  const [form, setForm] = useState({
    productName: '', category: '', brand: '', description: '',
    offer_type: 'percentage', title: '', custom_description: '',
    original_price: '', offer_price: '', total_stock: '', end_time: '',
    tags: [] as string[],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    businessesApi.mine().then((list) => {
      setBusinesses(list)
      if (list.length) setBusinessId(list[0].id)
    })
    // Only used to look up the current business's group name for the hint
    // text below — the actual dropdown options come from `forBusiness`.
    categoriesApi.list().then(setAllCategories)
  }, [])

  // Re-scope which categories are selectable whenever the business changes —
  // a Fashion & Apparel business only ever sees fashion sub-categories, an
  // Electronics & Mobile one only sees electronics ones, etc. (enforced
  // again server-side in ProductSerializer.validate, this is just the UI).
  useEffect(() => {
    if (!businessId) return
    categoriesApi.forBusiness(businessId).then((opts) => {
      setCategoryOptions(opts)
      setForm((f) => (opts.some((c) => String(c.id) === f.category) ? f : { ...f, category: opts[0] ? String(opts[0].id) : '' }))
    })
  }, [businessId])

  const selectedBusiness = businesses.find((b) => b.id === businessId)
  const businessGroupName = allCategories.find((c) => c.id === selectedBusiness?.category)?.name

  useEffect(() => {
    if (!editing) return
    offersApi.retrieve(Number(id)).then((o) => {
      setBusinessId(o.business.id)
      setProductId(o.product?.id ?? null)
      setForm({
        productName: o.product?.name || o.product_name,
        category: String(o.product?.category || ''),
        brand: o.product?.brand || '',
        description: o.product?.description || '',
        offer_type: o.offer_type,
        title: o.title,
        custom_description: o.custom_description || '',
        original_price: o.original_price,
        offer_price: o.offer_price || '',
        total_stock: o.total_stock != null ? String(o.total_stock) : '',
        end_time: o.end_time ? o.end_time.slice(0, 16) : '',
        tags: o.tags,
      })
    })
  }, [editing, id])

  const discountPreview = (() => {
    const orig = parseFloat(form.original_price)
    const off = parseFloat(form.offer_price)
    if (!orig || !off || orig <= 0) return null
    return Math.max(Math.round(((orig - off) / orig) * 100), 0)
  })()

  const toggleTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    setBusy(true)
    setError('')
    try {
      let offer
      if (editing) {
        offer = await offersApi.update(Number(id), {
          offer_type: form.offer_type as any,
          title: form.title,
          custom_description: form.custom_description,
          original_price: form.original_price,
          offer_price: form.offer_price || null,
          total_stock: form.total_stock ? Number(form.total_stock) : null,
          end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
          tags: form.tags,
        } as any)
      } else {
        const product = await productsApi.create({
          business: businessId,
          category: form.category ? Number(form.category) : undefined,
          name: form.productName,
          brand: form.brand,
          description: form.description,
        } as any)
        if (imageFile) await productsApi.uploadImage(product.id, imageFile, true)
        offer = await offersApi.create({
          business: businessId,
          product: product.id,
          offer_type: form.offer_type as any,
          title: form.title,
          custom_description: form.custom_description,
          original_price: form.original_price,
          offer_price: form.offer_price || undefined,
          total_stock: form.total_stock ? Number(form.total_stock) : undefined,
          end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
          tags: form.tags,
        } as any)
        await offersApi.publish(offer.id)
      }
      navigate('/dashboard/offers')
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Please check the required fields (product name, prices, business) and try again.'))
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">{editing ? 'Edit Offer' : 'Create an Offer'}</h1>
      <p className="text-sm text-ink-soft mb-5">Fill this in and hit publish — it goes live immediately.</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {businesses.length > 1 && (
          <select value={businessId ?? ''} onChange={(e) => setBusinessId(Number(e.target.value))} className="border border-border rounded-xl px-4 py-2.5 text-sm">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {!editing && (
          <>
            <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Product name (e.g. Men's Premium Shirt)" {...field('productName')} required />
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div>
                <select className="w-full border border-border rounded-xl px-4 py-2.5 text-sm" {...field('category')} required disabled={!categoryOptions.length}>
                  {!categoryOptions.length && <option value="">Loading…</option>}
                  {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {businessGroupName && (
                  <p className="text-[11px] text-ink-soft mt-1">Showing {businessGroupName} categories</p>
                )}
              </div>
              <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Brand (optional)" {...field('brand')} />
            </div>
            <textarea className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Product description" rows={2} {...field('description')} />
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
          </>
        )}

        {editing && productId && <ProductImageManager productId={productId} />}

        <select className="border border-border rounded-xl px-4 py-2.5 text-sm" {...field('offer_type')}>
          {OFFER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Offer headline (e.g. 50% OFF Men's Shirt)" {...field('title')} required />
        {form.offer_type === 'custom' && (
          <textarea className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Describe your custom offer" rows={2} {...field('custom_description')} />
        )}

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <input type="number" step="0.01" className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Original price (₹)" {...field('original_price')} required />
          <input type="number" step="0.01" className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Offer price (₹)" {...field('offer_price')} />
        </div>
        {discountPreview != null && (
          <p className="text-sm text-marigold-dark font-semibold">
            ₹{form.original_price} → ₹{form.offer_price} = {discountPreview}% OFF (calculated automatically)
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <input type="number" className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Total stock (blank = unlimited)" {...field('total_stock')} />
          <input type="datetime-local" className="border border-border rounded-xl px-4 py-2.5 text-sm" {...field('end_time')} />
        </div>

        <div>
          <p className="text-xs text-ink-soft mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {OFFER_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs rounded-full px-3 py-1.5 border ${form.tags.includes(tag) ? 'bg-marigold text-white border-marigold' : 'bg-canvas border-border text-ink-soft'}`}
              >
                {tag.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !businessId} className="bg-marigold text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Publishing…' : editing ? 'Save Changes' : 'Publish Offer'}
        </button>
      </form>
    </div>
  )
}
