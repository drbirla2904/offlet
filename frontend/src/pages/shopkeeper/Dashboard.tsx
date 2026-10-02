import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Bell, CheckCircle2, ChevronRight, CircleHelp, Eye, MessageCircle, Phone, Plus, Printer, Settings, Share2, Store, Users, Wallet } from 'lucide-react'
import { analyticsApi, businessesApi } from '../../api/endpoints'
import type { Business, DashboardStats } from '../../types'

function DashboardStat({ label, value, href, icon: Icon, tone = 'teal' }: {
  label: string
  value: number
  href: string
  icon: typeof Eye
  tone?: 'teal' | 'coral' | 'amber'
}) {
  return (
    <Link to={href} className="group min-w-0 border border-border bg-surface p-4 transition-colors hover:border-teal">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone === 'coral' ? 'bg-marigold-soft text-marigold' : tone === 'amber' ? 'bg-amber-soft text-amber' : 'bg-teal-soft text-teal'}`}>
          <Icon size={16} />
        </span>
        <ArrowUpRight size={15} className="text-ink-soft opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{value.toLocaleString()}</p>
      <p className="mt-0.5 truncate text-xs text-ink-soft">{label}</p>
    </Link>
  )
}

export function ShopkeeperDashboardPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    Promise.all([businessesApi.mine(), analyticsApi.dashboard()])
      .then(([list, dashboardStats]) => {
        if (!active) return
        setBusinesses(list)
        setStats(dashboardStats)
        if (!list.length) navigate('/dashboard/setup')
      })
      .catch(() => {
        if (active) setLoadError('Dashboard data could not be loaded. Check your connection and try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [navigate])

  const activeBusiness = businesses[0]
  const recentViews = stats?.daily_views.slice(-7) || []
  const maxViews = Math.max(...recentViews.map((day) => day.count), 1)
  const totalOfferCount = stats?.offer_counts.total || 0

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12" aria-busy="true"><div className="h-3 w-28 animate-pulse bg-border" /><div className="mt-3 h-8 w-56 animate-pulse bg-border" /><div className="mt-8 h-36 animate-pulse bg-border" /></div>
  }

  if (loadError) {
    return <div className="mx-auto max-w-3xl px-4 py-16"><p className="border-l-2 border-red-500 pl-3 text-sm text-red-700" role="alert">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-teal">Reload dashboard</button></div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:pt-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Owner workspace</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Business dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">Track your shop, offers, and customer activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/settings" aria-label="Open settings" className="flex h-10 items-center gap-2 border border-border bg-surface px-3 text-sm font-semibold text-ink transition hover:border-teal">
            <Settings size={16} /> Settings
          </Link>
          <Link to="/dashboard/poster" className="flex h-10 items-center gap-2 border border-border bg-surface px-3 text-sm font-semibold text-ink transition hover:border-teal">
            <Printer size={16} /> Print poster
          </Link>
          <Link to="/dashboard/offers/new" className="flex h-10 items-center gap-2 bg-marigold px-4 text-sm font-semibold text-white transition hover:bg-marigold-dark">
            <Plus size={16} /> New offer
          </Link>
        </div>
      </div>

      {activeBusiness && (
        <section className="mb-7 border-y border-border py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal"><Store size={24} /></div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-ink">{activeBusiness.name}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{[activeBusiness.area, activeBusiness.city].filter(Boolean).join(', ') || 'Add your shop location'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${activeBusiness.is_verified ? 'text-success' : 'text-amber'}`}>
                {activeBusiness.is_verified ? <CheckCircle2 size={15} /> : <Bell size={14} />}
                {activeBusiness.is_verified ? 'Verified shop' : 'Verification needed'}
              </span>
              <Link to={`/shops/${activeBusiness.id}`} className="flex h-9 items-center gap-1 border border-border px-3 text-sm font-semibold text-ink transition hover:border-teal">View storefront <ChevronRight size={15} /></Link>
            </div>
          </div>
          <div className="mt-5 grid max-w-2xl grid-cols-3 divide-x divide-border border-y border-border py-3">
            <Link to="/dashboard/offers?status=active" className="px-3 first:pl-0"><p className="font-display text-2xl font-semibold text-ink">{stats?.offer_counts.active || 0}</p><p className="mt-0.5 text-xs text-ink-soft">Live offers</p></Link>
            <Link to="/dashboard/offers" className="px-3"><p className="font-display text-2xl font-semibold text-ink">{totalOfferCount}</p><p className="mt-0.5 text-xs text-ink-soft">All offers</p></Link>
            <Link to="/account/messages" className="px-3"><p className="font-display text-2xl font-semibold text-ink">{stats?.chats_started || 0}</p><p className="mt-0.5 text-xs text-ink-soft">Conversations</p></Link>
          </div>
        </section>
      )}

      {activeBusiness && (
        <div className="mb-8 grid grid-cols-2 border-y border-border sm:grid-cols-4">
          <Link to="/account/messages" className="flex min-h-12 items-center gap-2 border-b border-r border-border px-3 py-3 text-sm font-semibold text-ink transition hover:bg-canvas sm:border-b-0"><MessageCircle size={17} className="text-teal" /> Inbox</Link>
          <a href={`tel:${activeBusiness.phone_number || ''}`} className="flex min-h-12 items-center gap-2 border-b border-border px-3 py-3 text-sm font-semibold text-ink transition hover:bg-canvas sm:border-b-0 sm:border-r"><Phone size={17} className="text-success" /> Call shop</a>
          <a href={`https://wa.me/91${activeBusiness.whatsapp_number?.replace(/\D/g, '') || ''}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 border-r border-border px-3 py-3 text-sm font-semibold text-ink transition hover:bg-canvas"><Share2 size={17} className="text-success" /> WhatsApp</a>
          <Link to="/dashboard/settings" className="flex min-h-12 items-center gap-2 px-3 py-3 text-sm font-semibold text-ink transition hover:bg-canvas"><Bell size={17} className="text-amber" /> Business tools</Link>
        </div>
      )}

      {businesses.length > 1 && businesses.slice(1).map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 bg-canvas rounded-xl p-3 mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{b.name}</p>
            <p className="text-xs text-ink-soft">
              {b.verification_status === 'verified' ? '✓ Verified' : `Verification: ${b.verification_status}`}
            </p>
          </div>
          <Link to="/dashboard/offers" className="text-sm text-teal font-medium shrink-0">Manage offers →</Link>
        </div>
      ))}

      {stats && (
        <>
          <div className="flex items-end justify-between gap-3 mb-3">
            <div><p className="text-xs uppercase tracking-[0.14em] text-ink-soft font-bold">Offer health</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Your inventory at a glance</h2></div>
            <Link to="/dashboard/offers" className="text-sm text-teal font-semibold">Manage all <ChevronRight size={15} className="inline" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DashboardStat label="Active offers" value={stats.offer_counts.active || 0} href="/dashboard/offers?status=active" icon={Eye} tone="coral" />
              <DashboardStat label="Total offers" value={stats.offer_counts.total || 0} href="/dashboard/offers?status=all" icon={Store} />
              <DashboardStat label="Paused offers" value={stats.offer_counts.paused || 0} href="/dashboard/offers?status=paused" icon={Wallet} tone="amber" />
              <DashboardStat label="Expired offers" value={stats.offer_counts.expired || 0} href="/dashboard/offers?status=expired" icon={CircleHelp} tone="amber" />
          </div>
          <div className="flex items-end justify-between gap-3 mt-7 mb-3">
            <div><p className="text-xs uppercase tracking-[0.14em] text-ink-soft font-bold">Customer activity</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Turn attention into visits</h2></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DashboardStat label="Total views" value={stats.total_views} href="/dashboard/offers" icon={Eye} />
            <DashboardStat label="Calls" value={stats.calls} href={activeBusiness?.phone_number ? `tel:${activeBusiness.phone_number}` : '/dashboard/settings'} icon={Phone} />
            <DashboardStat label="WhatsApp clicks" value={stats.whatsapp_clicks} href={activeBusiness?.whatsapp_number ? `https://wa.me/91${activeBusiness.whatsapp_number.replace(/\D/g, '')}` : '/dashboard/settings'} icon={MessageCircle} />
            <DashboardStat label="Chats started" value={stats.chats_started} href="/account/messages" icon={Users} />
            <DashboardStat label="Direction requests" value={stats.direction_requests} href={activeBusiness ? `/shops/${activeBusiness.id}` : '/dashboard/settings'} icon={Store} />
            <DashboardStat label="Favorites" value={stats.favorites} href="/dashboard/offers" icon={Wallet} />
            <DashboardStat label="Shares" value={stats.shares} href={activeBusiness ? `/shops/${activeBusiness.id}` : '/dashboard/settings'} icon={Share2} />
            <DashboardStat label="Reviews" value={stats.reviews} href={activeBusiness ? `/shops/${activeBusiness.id}` : '/dashboard/settings'} icon={CircleHelp} />
          </div>

          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 mt-7">
            <section className="bg-surface border border-border rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-teal font-bold">Last 7 days</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Reach trend</h2></div><BarChart3 size={20} className="text-teal" /></div>
              <div className="h-40 flex items-end gap-2 mt-6">
                {recentViews.length ? recentViews.map((day) => <div key={day.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end"><div title={`${day.count} views`} className="w-full max-w-8 rounded-t-lg bg-teal transition hover:bg-marigold" style={{ height: `${Math.max((day.count / maxViews) * 100, 6)}%` }} /><span className="text-[10px] text-ink-soft">{day.day.slice(5)}</span></div>) : <p className="text-sm text-ink-soft">Your views trend will appear once customers discover your offers.</p>}
              </div>
            </section>
            <section className="bg-ink text-white rounded-3xl p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/60 font-bold">Growth checklist</p><h2 className="font-display text-xl font-semibold mt-1">Keep your storefront sharp</h2>
              <div className="flex flex-col gap-3 mt-5 text-sm"><Link to="/dashboard/offers/new" className="flex items-center justify-between border-b border-white/15 pb-3 hover:text-teal-soft">Publish a fresh offer <ChevronRight size={16} /></Link><Link to="/dashboard/settings" className="flex items-center justify-between border-b border-white/15 pb-3 hover:text-teal-soft">Complete business profile <ChevronRight size={16} /></Link><Link to="/account/messages" className="flex items-center justify-between hover:text-teal-soft">Reply to customers <ChevronRight size={16} /></Link></div>
            </section>
          </div>

          <div className="flex items-end justify-between gap-3 mt-7 mb-2"><div><p className="text-xs uppercase tracking-[0.14em] text-ink-soft font-bold">Performance</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Best-performing offers</h2></div><Link to="/dashboard/offers" className="text-sm text-teal font-semibold">View offers <ChevronRight size={15} className="inline" /></Link></div>
          <div className="bg-surface border border-border rounded-3xl px-4 flex flex-col divide-y divide-border">
            {stats.best_performing_offers.map((o) => (
              <Link to={`/dashboard/offers/${o.id}/edit`} key={o.id} className="py-3 flex items-center justify-between gap-3 text-sm group">
                <span className="text-ink truncate min-w-0 font-medium group-hover:text-teal">{o.title}</span>
                <span className="text-ink-soft shrink-0 text-xs sm:text-sm">{o.view_count} views · {o.favorite_count} saves</span>
              </Link>
            ))}
            {!stats.best_performing_offers.length && <p className="text-sm text-ink-soft py-2">No offers yet.</p>}
          </div>
        </>
      )}
    </div>
  )
}
