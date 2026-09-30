import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { analyticsApi, businessesApi } from '../../api/endpoints'
import type { Business, DashboardStats } from '../../types'

export function ShopkeeperDashboardPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    businessesApi.mine().then((list) => {
      setBusinesses(list)
      if (!list.length) navigate('/dashboard/setup')
    })
    analyticsApi.dashboard().then(setStats)
  }, [navigate])

  const StatCard = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-surface border border-border rounded-xl p-3">
      <p className="text-xl font-display font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/dashboard/settings" className="bg-canvas border border-border text-ink rounded-full px-4 py-2 text-sm font-semibold">
            Settings
          </Link>
          <Link to="/dashboard/offers/new" className="bg-marigold text-white rounded-full px-4 py-2 text-sm font-semibold">
            + Create Offer
          </Link>
        </div>
      </div>

      {businesses.map((b) => (
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Active Offers" value={stats.offer_counts.active} />
            <StatCard label="Total Offers" value={stats.offer_counts.total} />
            <StatCard label="Paused" value={stats.offer_counts.paused} />
            <StatCard label="Expired" value={stats.offer_counts.expired} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="Total Views" value={stats.total_views} />
            <StatCard label="Calls" value={stats.calls} />
            <StatCard label="WhatsApp Clicks" value={stats.whatsapp_clicks} />
            <StatCard label="Direction Requests" value={stats.direction_requests} />
            <StatCard label="Favorites" value={stats.favorites} />
            <StatCard label="Shares" value={stats.shares} />
            <StatCard label="Chats Started" value={stats.chats_started} />
            <StatCard label="Reviews" value={stats.reviews} />
          </div>

          <h2 className="font-display text-lg font-semibold text-ink mt-6 mb-2">Best-performing offers</h2>
          <div className="flex flex-col divide-y divide-border">
            {stats.best_performing_offers.map((o) => (
              <div key={o.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink truncate min-w-0">{o.title}</span>
                <span className="text-ink-soft shrink-0 text-xs sm:text-sm">{o.view_count} views · {o.favorite_count} saves</span>
              </div>
            ))}
            {!stats.best_performing_offers.length && <p className="text-sm text-ink-soft py-2">No offers yet.</p>}
          </div>
        </>
      )}
    </div>
  )
}
