export function formatINR(value: string | number | null | undefined) {
  if (value == null) return ''
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return ''
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDistance(km: number | null | undefined) {
  if (km == null) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export const TAG_LABELS: Record<string, string> = {
  demo: 'Demo',
  hot_deal: 'Hot Deal',
  flash_sale: 'Flash Sale',
  limited_stock: 'Limited Stock',
  clearance: 'Clearance',
  best_seller: 'Best Seller',
  new: 'New',
  popular: 'Popular',
  todays_deal: "Today's Deal",
  price_drop: 'Price Drop',
  last_pieces: 'Last Pieces',
  exclusive: 'Exclusive',
  verified_shop: 'Verified Shop',
}
