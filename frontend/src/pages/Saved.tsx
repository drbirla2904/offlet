import { useEffect, useState } from 'react'
import { favoritesApi, followsApi } from '../api/endpoints'
import { OfferCard } from '../components/OfferCard'
import { BusinessCard } from '../components/BusinessCard'
import type { Offer, Business } from '../types'

export function SavedPage() {
  const [tab, setTab] = useState<'offers' | 'shops'>('offers')
  const [favorites, setFavorites] = useState<{ id: number; offer: Offer }[]>([])
  const [follows, setFollows] = useState<{ id: number; business: Business }[]>([])

  useEffect(() => {
    favoritesApi.list().then((r) => setFavorites(r.results || r))
    followsApi.list().then((r) => setFollows(r.results || r))
  }, [])

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto px-4 pt-4">
      <h1 className="font-display text-2xl font-semibold text-ink mb-3">Saved</h1>
      <div className="flex gap-4 border-b border-border text-sm font-medium mb-4">
        <button onClick={() => setTab('offers')} className={`pb-2 ${tab === 'offers' ? 'text-marigold border-b-2 border-marigold' : 'text-ink-soft'}`}>
          Saved Offers ({favorites.length})
        </button>
        <button onClick={() => setTab('shops')} className={`pb-2 ${tab === 'shops' ? 'text-marigold border-b-2 border-marigold' : 'text-ink-soft'}`}>
          Followed Shops ({follows.length})
        </button>
      </div>
      {tab === 'offers' ? (
        <div className="flex flex-wrap gap-3">
          {favorites.map((f) => <OfferCard key={f.id} offer={f.offer} />)}
          {!favorites.length && <p className="text-sm text-ink-soft">Nothing saved yet — tap the heart on any offer.</p>}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {follows.map((f) => <BusinessCard key={f.id} business={f.business} />)}
          {!follows.length && <p className="text-sm text-ink-soft">You're not following any shops yet.</p>}
        </div>
      )}
    </div>
  )
}
