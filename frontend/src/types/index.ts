export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  parent: number | null
  order: number
}

export interface Business {
  id: number
  owner?: number
  name: string
  business_type: 'shop' | 'service' | 'restaurant' | 'retail' | 'other'
  category: number | null
  description?: string
  address_line?: string
  area: string
  city: string
  state?: string
  pincode?: string
  latitude: number | null
  longitude: number | null
  phone_number?: string
  whatsapp_number?: string
  opening_hours?: Record<string, [string, string] | null>
  logo: string | null
  photos?: { id: number; image: string; order: number }[]
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended'
  is_verified: boolean
  is_active?: boolean
  rating_average: number
  rating_count: number
  follower_count: number
  distance_km: number | null
  is_following?: boolean
  active_offer_count?: number
  created_at?: string
}

export interface ProductImage {
  id: number
  image: string
  is_primary: boolean
  order: number
}

export interface Product {
  id: number
  business: number
  category: number | null
  category_name?: string
  name: string
  description: string
  brand: string
  sku: string
  video_url: string
  images: ProductImage[]
  created_at: string
}

export type OfferType =
  | 'percentage' | 'fixed_price' | 'bogo' | 'buy_x_get_y' | 'clearance'
  | 'flash_sale' | 'limited_stock' | 'combo' | 'free_item' | 'custom'

export type OfferStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'sold_out'

export interface Offer {
  id: number
  business: Business
  product?: Product
  product_name: string
  product_image: string | null
  offer_type: OfferType
  title: string
  custom_description?: string
  original_price: string
  offer_price: string | null
  discount_percentage: number
  buy_quantity?: number | null
  get_quantity?: number | null
  tags: string[]
  status: OfferStatus
  start_time: string | null
  end_time: string | null
  total_stock?: number | null
  sold_quantity?: number
  available_stock: number | null
  is_sold_out: boolean
  seconds_remaining: number | null
  distance_km: number | null
  is_featured: boolean
  is_trending: boolean
  is_sponsored: boolean
  view_count: number
  favorite_count: number
  is_favorited: boolean
  created_at: string
}

export interface User {
  id: number
  phone_number: string
  email: string | null
  username: string
  role: 'customer' | 'shopkeeper' | 'admin'
  is_phone_verified: boolean
  date_joined: string
  profile?: CustomerProfile
}

export interface CustomerProfile {
  preferred_city: string
  preferred_area: string
  last_latitude: number | null
  last_longitude: number | null
  notify_new_nearby_offers: boolean
  notify_followed_shops: boolean
  notify_saved_offer_expiry: boolean
  notify_price_drops: boolean
}

export interface Review {
  id: number
  user: number
  user_name: string
  business: number
  rating: number
  comment: string
  image: string | null
  created_at: string
}

export interface Notification {
  id: number
  kind: string
  title: string
  body: string
  offer: number | null
  offer_title?: string
  business: number | null
  business_name?: string
  is_read: boolean
  created_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DashboardStats {
  offer_counts: Record<string, number>
  total_views: number
  calls: number
  whatsapp_clicks: number
  direction_requests: number
  favorites: number
  shares: number
  chats_started: number
  reports: number
  reviews: number
  daily_views: { day: string; count: number }[]
  best_performing_offers: { id: number; title: string; view_count: number; favorite_count: number; status: string }[]
}
