import type { Product } from '../types'

function formatPrice(value: number | string | null | undefined) {
  if (value == null || value === '') return null
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function formatCatalogProductPrice(product: Product) {
  if (product.display_price) return product.display_price
  if (product.pricing_mode === 'static') return formatPrice(product.price) || 'Price on request'
  if (product.price_note) return product.price_note

  const minimum = product.price_min ?? product.price
  const maximum = product.price_max
  if (minimum != null && maximum != null && Number(minimum) !== Number(maximum)) {
    return `${formatPrice(minimum)} – ${formatPrice(maximum)}`
  }
  return formatPrice(minimum ?? maximum) || 'Price on request'
}
