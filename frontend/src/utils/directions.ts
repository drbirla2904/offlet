import type { Business } from '../types'

export function getDirectionsUrl(business: Business): string {
  const hasCoordinates = Number.isFinite(business.latitude) && Number.isFinite(business.longitude)
  const destination = hasCoordinates
    ? `${business.latitude},${business.longitude}`
    : [business.address_line, business.area, business.city, business.state, business.pincode]
      .filter(Boolean)
      .join(', ')

  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}