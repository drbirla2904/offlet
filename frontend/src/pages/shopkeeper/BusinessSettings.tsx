import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, Clock3, ExternalLink, FileCheck2, ImagePlus, MapPin, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
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
  const [hoursError, setHoursError] = useState('')

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
    }).catch(() => setPageError('Your shop profile could not be loaded. Please try again.'))
      .finally(() => setLoading(false))
    categoriesApi.topLevel().then(setCategories).catch(() => {})
  }, [])

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-14 text-center text-sm text-ink-soft">Loading shop settings…</div>
  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-700">{pageError || 'No shop profile was found.'}</p>
        <Link to="/dashboard/setup" className="mt-4 inline-block text-sm font-semibold text-teal">Set up a shop profile</Link>
      </div>
    )
  }

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
    setHoursError('')
    try {
      await businessesApi.update(business.id, { opening_hours: hours })
      setHoursSaved(true)
    } catch (err) {
      setHoursError(apiErrorMessage(err, 'Could not save opening hours. Please try again.'))
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
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:pt-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Business workspace</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Shop settings</h1>
          <p className="mt-1 text-sm text-ink-soft">Manage the details customers see on your storefront.</p>
        </div>
        <Link to={`/shops/${business.id}`} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-sm font-semibold text-ink transition hover:border-teal">
          <ExternalLink size={16} /> View storefront
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-ink"><Building2 size={16} className="text-teal" />{business.name}</span>
        <span className="inline-flex items-center gap-1.5 text-ink-soft"><MapPin size={15} />{[business.area, business.city].filter(Boolean).join(', ') || 'Location not set'}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${business.is_verified ? 'text-success' : 'text-amber'}`}>
          {business.is_verified ? <BadgeCheck size={15} /> : <FileCheck2 size={14} />}
          {business.is_verified ? 'Verified' : `Verification ${business.verification_status}`}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside>
          <nav aria-label="Shop settings sections" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border pb-3 lg:sticky lg:top-24 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-l lg:pb-0">
            <a href="#shop-profile" className="shrink-0 px-3 py-2 text-sm font-semibold text-teal lg:border-l-2 lg:border-teal lg:-ml-px">Shop profile</a>
            <a href="#shop-branding" className="shrink-0 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink">Branding</a>
            <a href="#opening-hours" className="shrink-0 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink">Opening hours</a>
            <a href="#verification" className="shrink-0 px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink">Verification</a>
          </nav>
        </aside>

        <div className="min-w-0">
      <section id="shop-profile" className="scroll-mt-24 border-b border-border pb-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Public details</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">Shop profile</h2>
          <p className="mt-1 text-sm text-ink-soft">Keep your business information accurate and easy to find.</p>
        </div>
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
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button disabled={savingProfile} className="inline-flex h-10 items-center gap-2 bg-marigold px-5 text-sm font-semibold text-white transition hover:bg-marigold-dark disabled:opacity-60">
              <Save size={16} />
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {profileSaved && <span role="status" className="text-sm font-medium text-success">Profile saved</span>}
          </div>
        </form>
      </section>

      <section id="shop-branding" className="scroll-mt-24 border-b border-border py-8">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Visual identity</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">Branding</h2>
        </div>
        <form onSubmit={saveLogo} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {business.logo ? (
              <img src={resolveMediaUrl(business.logo)} alt={`${business.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-canvas p-1 border border-border" />
            ) : (
              <div aria-hidden="true" className="w-14 h-14 rounded-xl bg-marigold-soft text-marigold font-display text-xl font-semibold flex items-center justify-center">
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <label className="flex-1 text-xs text-ink-soft">
              <span className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><ImagePlus size={15} /> Shop logo</span>
              Use a clear square image. JPG, PNG, or WebP.
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setLogoFile(e.target.files?.[0] || null); setLogoMessage('') }} className="mt-1 block w-full text-sm text-ink" />
            </label>
          </div>
          {logoMessage && <p role="status" className="text-sm text-ink-soft">{logoMessage}</p>}
          <button disabled={savingLogo || !logoFile} className="self-start border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-teal disabled:opacity-60">
            {savingLogo ? 'Optimizing and uploading…' : 'Update logo'}
          </button>
        </form>
      </section>

      <section id="opening-hours" className="scroll-mt-24 border-b border-border py-8">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Customer information</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold text-ink"><Clock3 size={19} className="text-teal" /> Opening hours</h2>
          <p className="mt-1 text-sm text-ink-soft">Shown on your public shop profile.</p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {DAYS.map(({ key, label }) => {
            const value = hours[key]
            const closed = value === null || value === undefined
            return (
              <div key={key} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-24 shrink-0 text-sm font-medium text-ink">{label}</span>
                <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                  <input type="checkbox" checked={!closed} onChange={(event) => setDayHours(key, event.target.checked ? ['10:00', '21:00'] : null)} />
                  Open
                </label>
                {!closed && (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <label className="sr-only" htmlFor={`hours-${key}-open`}>{label} opening time</label>
                    <input id={`hours-${key}-open`} type="time" value={value[0]} onChange={(event) => setDayHours(key, [event.target.value, value[1]])} className="min-w-0 flex-1 border border-border px-2 py-2 text-sm sm:flex-none" />
                    <span className="shrink-0 text-xs text-ink-soft">to</span>
                    <label className="sr-only" htmlFor={`hours-${key}-close`}>{label} closing time</label>
                    <input id={`hours-${key}-close`} type="time" value={value[1]} onChange={(event) => setDayHours(key, [value[0], event.target.value])} className="min-w-0 flex-1 border border-border px-2 py-2 text-sm sm:flex-none" />
                  </div>
                )}
                {closed && <span className="text-xs text-ink-soft">Closed</span>}
              </div>
            )
          })}
        </div>
        {hoursError && <p role="alert" className="mt-3 text-sm text-red-700">{hoursError}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveHours} disabled={savingHours} className="inline-flex h-10 items-center gap-2 bg-marigold px-5 text-sm font-semibold text-white transition hover:bg-marigold-dark disabled:opacity-60">
            <Save size={16} />{savingHours ? 'Saving…' : 'Save hours'}
          </button>
          {hoursSaved && <span role="status" className="text-sm font-medium text-success">Hours saved</span>}
        </div>
      </section>

      <section id="verification" className="scroll-mt-24 py-8">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Trust & safety</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">Business verification</h2>
        </div>
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
        </div>
      </div>
    </div>
  )
}
