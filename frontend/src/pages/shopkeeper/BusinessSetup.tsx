import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { businessesApi, categoriesApi } from '../../api/endpoints'
import { apiErrorMessage } from '../../utils/apiError'
import type { Category } from '../../types'

const TYPES = [
  { value: 'shop', label: 'Physical Shop' },
  { value: 'service', label: 'Service Business' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'other', label: 'Other' },
]

export function BusinessSetupPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: '', business_type: 'shop', category: '', description: '',
    address_line: '', area: '', city: '', state: '', pincode: '',
    latitude: '', longitude: '', phone_number: '', whatsapp_number: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    categoriesApi.topLevel().then(setCategories)
  }, [])

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }))
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await businessesApi.create({
        ...form,
        category: form.category ? Number(form.category) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      } as any)
      navigate('/dashboard')
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Please check the required fields and try again.'))
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Set up your business</h1>
      <p className="text-sm text-ink-soft mb-5">This becomes your public shop profile — customers see it before they visit.</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Business / shop name" {...field('name')} required />
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <select className="border border-border rounded-xl px-4 py-2.5 text-sm" {...field('business_type')}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="border border-border rounded-xl px-4 py-2.5 text-sm" {...field('category')} required>
            <option value="">Category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <p className="text-xs text-ink-soft -mt-2">
          Pick the broad category you sell in — you'll choose the specific type (e.g. "Men's Fashion") for each offer.
        </p>
        <textarea className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Short description" rows={2} {...field('description')} />
        <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Address line" {...field('address_line')} required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Area" {...field('area')} />
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="City" {...field('city')} required />
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Pincode" {...field('pincode')} />
        </div>
        <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="State" {...field('state')} />
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Phone number" {...field('phone_number')} required />
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="WhatsApp number" {...field('whatsapp_number')} />
        </div>
        <button type="button" onClick={useMyLocation} className="text-sm text-teal text-left">📍 Use my current GPS location</button>
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Latitude" {...field('latitude')} />
          <input className="border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Longitude" {...field('longitude')} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="bg-marigold text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Saving…' : 'Create Business Profile'}
        </button>
      </form>
    </div>
  )
}
