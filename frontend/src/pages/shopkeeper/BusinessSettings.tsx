import { useEffect, useState } from 'react'
import { businessesApi, categoriesApi } from '../../api/endpoints'
import { apiErrorMessage } from '../../utils/apiError'
import type { Business, Category } from '../../types'
import { resolveMediaUrl } from '../../utils/mediaUrl'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' }, { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

type Hours = Record<string, [string, string] | null>
type BusinessProfileForm = {
  name: string
  business_type: Business['business_type']
  category: string
  description: string
  address_line: string
  area: string
  city: string
  state: string
  pincode: string
  phone_number: string
  whatsapp_number: string
}

const BUSINESS_TYPES: { value: Business['business_type']; label: string }[] = [
  { value: 'shop', label: 'Physical shop' },
  { value: 'service', label: 'Service business' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail store' },
  { value: 'other', label: 'Other' },
]

const emptyProfile: BusinessProfileForm = {
  name: '', business_type: 'shop', category: '', description: '', address_line: '',
  area: '', city: '', state: '', pincode: '', phone_number: '', whatsapp_number: '',
}

export function BusinessSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [profile, setProfile] = useState<BusinessProfileForm>(emptyProfile)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [savingLogo, setSavingLogo] = useState(false)
  const [logoMessage, setLogoMessage] = useState('')
  const [hours, setHours] = useState<Hours>({})
  const [savingHours, setSavingHours] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  const [document, setDocument] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')

  useEffect(() => {
    businessesApi.mine().then((list) => {
      const b = list[0]
      if (b) {
        setBusiness(b)
        setHours(b.opening_hours || {})
        setProfile({
          name: b.name,
          business_type: b.business_type,
          category: b.category ? String(b.category) : '',
          description: b.description || '',
          address_line: b.address_line || '',
          area: b.area || '',
          city: b.city || '',
          state: b.state || '',
          pincode: b.pincode || '',
          phone_number: b.phone_number || '',
          whatsapp_number: b.whatsapp_number || '',
        })
      }
    })
    categoriesApi.topLevel().then(setCategories)
  }, [])

  if (!business) return <p className="text-center text-ink-soft py-10 text-sm">Loading…</p>

  const setDayHours = (day: string, value: [string, string] | null) => {
    setHours((h) => ({ ...h, [day]: value }))
    setHoursSaved(false)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    setProfileSaved(false)
    try {
      const updated = await businessesApi.update(business.id, {
        ...profile,
        category: profile.category ? Number(profile.category) : null,
      })
      setBusiness(updated)
      setProfileSaved(true)
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'Could not save your shop profile. Please try again.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const updateProfileField = (field: keyof BusinessProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }))
    setProfileSaved(false)
  }

  const saveLogo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logoFile) return
    setSavingLogo(true)
    setLogoMessage('')
    try {
      const updated = await businessesApi.updateLogo(business.id, logoFile)
      setBusiness(updated)
      setLogoFile(null)
      setLogoMessage('Shop logo updated.')
    } catch (err) {
      setLogoMessage(apiErrorMessage(err, 'Could not update the shop logo. Please try a different image.'))
    } finally {
      setSavingLogo(false)
    }
  }

  const saveHours = async () => {
    setSavingHours(true)
    try {
      await businessesApi.update(business.id, { opening_hours: hours })
      setHoursSaved(true)
    } finally {
      setSavingHours(false)
    }
  }

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document) return
    setSubmittingVerification(true)
    setVerificationMessage('')
    try {
      const fd = new FormData()
      fd.append('document', document)
      fd.append('note', note)
      await businessesApi.submitVerification(business.id, fd)
      setVerificationMessage('Submitted — we\'ll review your documents and update your badge shortly.')
      setBusiness({ ...business, verification_status: 'pending' })
      setDocument(null)
      setNote('')
    } catch (err: any) {
      setVerificationMessage(apiErrorMessage(err, 'Something went wrong — please check the file and try again.'))
    } finally {
      setSubmittingVerification(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Business Settings</h1>
      <p className="text-sm text-ink-soft mb-6">{business.name}</p>

      <section className="mb-8 border-b border-border pb-8">
        <h2 className="font-display text-lg font-semibold text-ink mb-1">Shop profile</h2>
        <p className="text-sm text-ink-soft mb-4">These details appear on your public shop page.</p>
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Shop name
            <input required maxLength={150} value={profile.name} onChange={(e) => updateProfileField('name', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              Business type
              <select value={profile.business_type} onChange={(e) => updateProfileField('business_type', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink">
                {BUSINESS_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              Category
              <select value={profile.category} onChange={(e) => updateProfileField('category', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink">
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Description
            <textarea value={profile.description} onChange={(e) => updateProfileField('description', e.target.value)} rows={3} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Street address
            <input required value={profile.address_line} onChange={(e) => updateProfileField('address_line', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink" />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['area', 'city', 'state', 'pincode'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
                {field === 'pincode' ? 'PIN code' : field[0].toUpperCase() + field.slice(1)}
                <input required={field === 'city'} value={profile[field]} onChange={(e) => updateProfileField(field, e.target.value)} className="min-w-0 border border-border rounded-xl px-3 py-2.5 text-sm text-ink" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              Contact phone
              <input required type="tel" value={profile.phone_number} onChange={(e) => updateProfileField('phone_number', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
              WhatsApp number
              <input type="tel" value={profile.whatsapp_number} onChange={(e) => updateProfileField('whatsapp_number', e.target.value)} className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink" />
            </label>
          </div>
          {profileError && <p role="alert" className="text-sm text-red-700">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button disabled={savingProfile} className="bg-marigold text-white rounded-xl py-2.5 px-6 text-sm font-semibold disabled:opacity-60">
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {profileSaved && <span role="status" className="text-sm text-teal">Profile saved</span>}
          </div>
        </form>
        <form onSubmit={saveLogo} className="mt-6 border-t border-border pt-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">Shop logo</h3>
          <div className="flex items-center gap-3">
            {business.logo ? (
              <img src={resolveMediaUrl(business.logo)} alt={`${business.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-canvas p-1 border border-border" />
            ) : (
              <div aria-hidden="true" className="w-14 h-14 rounded-xl bg-marigold-soft text-marigold font-display text-xl font-semibold flex items-center justify-center">
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <label className="flex-1 text-xs text-ink-soft">
              Choose a square shop image
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setLogoFile(e.target.files?.[0] || null); setLogoMessage('') }} className="mt-1 block w-full text-sm text-ink" />
            </label>
          </div>
          {logoMessage && <p role="status" className="text-sm text-ink-soft">{logoMessage}</p>}
          <button disabled={savingLogo || !logoFile} className="self-start bg-canvas border border-border text-ink rounded-xl py-2 px-4 text-sm font-semibold disabled:opacity-60">
            {savingLogo ? 'Optimizing and uploading…' : 'Update logo'}
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-ink mb-1">Verification</h2>
        <p className="text-sm text-ink-soft mb-3">
          Current status:{' '}
          <span className={business.verification_status === 'verified' ? 'text-teal font-semibold' : 'font-semibold'}>
            {business.verification_status === 'verified' ? '✓ Verified' : business.verification_status}
          </span>
        </p>
        {business.verification_status !== 'verified' && (
          <form onSubmit={submitVerification} className="flex flex-col gap-3">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setDocument(e.target.files?.[0] || null)}
              className="text-sm"
              required
            />
            <p className="text-xs text-ink-soft -mt-1">Shop license, GST certificate, or ID proof (image or PDF).</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you'd like our team to know (optional)"
              className="border border-border rounded-xl px-4 py-2.5 text-sm"
              rows={2}
            />
            {verificationMessage && <p className="text-sm text-teal">{verificationMessage}</p>}
            <button disabled={submittingVerification || !document} className="bg-marigold text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 self-start px-6">
              {submittingVerification ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink mb-1">Opening Hours</h2>
        <p className="text-sm text-ink-soft mb-3">Shown on your public shop profile.</p>
        <div className="flex flex-col gap-2">
          {DAYS.map(({ key, label }) => {
            const value = hours[key]
            const closed = value === null || value === undefined
            return (
              // flex-wrap + the time-input group as one unit (w-full on
              // mobile) so the two <input type="time"> — which browsers
              // won't shrink much below ~90px each — drop to their own full
              // line on narrow screens instead of overflowing the row.
              <div key={key} className="flex flex-wrap items-center gap-2 py-1.5 border-b border-border last:border-0">
                <span className="w-24 text-sm text-ink shrink-0">{label}</span>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft shrink-0">
                  <input
                    type="checkbox"
                    checked={!closed}
                    onChange={(e) => setDayHours(key, e.target.checked ? ['10:00', '21:00'] : null)}
                  />
                  Open
                </label>
                {!closed && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="time"
                      value={value[0]}
                      onChange={(e) => setDayHours(key, [e.target.value, value[1]])}
                      className="border border-border rounded-lg px-2 py-1 text-xs flex-1 min-w-0 sm:flex-none"
                    />
                    <span className="text-ink-soft text-xs shrink-0">to</span>
                    <input
                      type="time"
                      value={value[1]}
                      onChange={(e) => setDayHours(key, [value[0], e.target.value])}
                      className="border border-border rounded-lg px-2 py-1 text-xs flex-1 min-w-0 sm:flex-none"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={saveHours}
          disabled={savingHours}
          className="bg-marigold text-white rounded-xl py-2.5 px-6 text-sm font-semibold disabled:opacity-60 mt-4"
        >
          {savingHours ? 'Saving…' : 'Save Hours'}
        </button>
        {hoursSaved && <span className="text-sm text-teal ml-3">Saved ✓</span>}
      </section>
    </div>
  )
}
