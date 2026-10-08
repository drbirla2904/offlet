import { apiClient } from './client'
import type {
  Business, Category, DashboardStats, Notification, Offer, Paginated, Product, ProductImage, Review, User,
} from '../types'
import { optimizeImage } from '../utils/optimizeImage'

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories/').then((r) => r.data),
  /** Top-level groups only (e.g. "Fashion & Apparel") — used for the
   * business-registration category picker. */
  topLevel: () => apiClient.get<Category[]>('/categories/', { params: { top_level: true } }).then((r) => r.data),
  /** Exactly the sub-categories a given business's offers may use — that
   * business's category's children, or the category itself if it has none.
   * Used for the offer-creation category picker so a Fashion & Apparel
   * business only ever sees fashion sub-categories, never Electronics. */
  forBusiness: (businessId: number) =>
    apiClient.get<Category[]>('/categories/', { params: { for_business: businessId } }).then((r) => r.data),
}

export interface OfferListParams {
  lat?: number; lng?: number; radius_km?: number
  category?: number; min_price?: number; max_price?: number; min_discount?: number
  offer_type?: string; tag?: string; city?: string; verified_only?: boolean
  expiring_soon?: boolean; search?: string; ordering?: string
  mine?: boolean; status?: string; business?: number; page?: number
  is_featured?: boolean; is_trending?: boolean; is_sponsored?: boolean; promoted?: boolean
}

export const offersApi = {
  list: (params: OfferListParams = {}) =>
    apiClient.get<Paginated<Offer>>('/offers/', { params }).then((r) => r.data),
  retrieve: (id: number) => apiClient.get<Offer>(`/offers/${id}/`).then((r) => r.data),
  create: (payload: Partial<Offer> & { business: number; product: number }) =>
    apiClient.post<Offer>('/offers/', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Offer>) =>
    apiClient.patch<Offer>(`/offers/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`/offers/${id}/`),
  publish: (id: number) => apiClient.post<Offer>(`/offers/${id}/publish/`).then((r) => r.data),
  turnOn: (id: number) => apiClient.post<Offer>(`/offers/${id}/turn_on/`).then((r) => r.data),
  turnOff: (id: number) => apiClient.post<Offer>(`/offers/${id}/turn_off/`).then((r) => r.data),
  duplicate: (id: number) => apiClient.post<Offer>(`/offers/${id}/duplicate/`).then((r) => r.data),
  logView: (id: number, guestId?: string) => apiClient.post(`/offers/${id}/log_view/`, { guest_id: guestId }),
  interact: (id: number, type: 'call' | 'whatsapp' | 'directions' | 'share', guestId?: string) =>
    apiClient.post(`/offers/${id}/interact/`, { type, guest_id: guestId }),
}

export interface BusinessListParams {
  lat?: number; lng?: number; radius_km?: number
  city?: string; category?: number; search?: string; verified_only?: boolean; page?: number
}

export const businessesApi = {
  list: (params: BusinessListParams = {}) =>
    apiClient.get<Paginated<Business>>('/businesses/', { params }).then((r) => r.data),
  retrieve: (id: number) => apiClient.get<Business>(`/businesses/${id}/`).then((r) => r.data),
  mine: () => apiClient.get<Business[]>('/businesses/mine/').then((r) => r.data),
  create: (payload: Partial<Business>) => apiClient.post<Business>('/businesses/', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Business>) =>
    apiClient.patch<Business>(`/businesses/${id}/`, payload).then((r) => r.data),
  updateLogo: async (id: number, file: File) => {
    const form = new FormData()
    form.append('logo', await optimizeImage(file))
    return apiClient.patch<Business>(`/businesses/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  submitVerification: (id: number, formData: FormData) =>
    apiClient.post(`/businesses/${id}/submit_verification/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

export const productsApi = {
  list: (businessId: number, page = 1) =>
    apiClient.get<Paginated<Product>>('/products/', { params: { business: businessId, page } }).then((r) => r.data),
  create: (payload: Partial<Product> & { business: number }) =>
    apiClient.post<Product>('/products/', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Product>) =>
    apiClient.patch<Product>(`/products/${id}/`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`/products/${id}/`),
  uploadImage: async (productId: number, file: File, isPrimary = false) => {
    const fd = new FormData()
    fd.append('product', String(productId))
    fd.append('image', await optimizeImage(file))
    fd.append('is_primary', String(isPrimary))
    return apiClient.post('/product-images/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
}

export const productImagesApi = {
  list: (productId: number) =>
    apiClient.get<Paginated<ProductImage> | ProductImage[]>('/product-images/', { params: { product: productId } }).then((r) => r.data),
  remove: (imageId: number) => apiClient.delete(`/product-images/${imageId}/`),
  setPrimary: (imageId: number) => apiClient.post(`/product-images/${imageId}/set_primary/`).then((r) => r.data),
}

export const favoritesApi = {
  list: () => apiClient.get('/favorites/').then((r) => r.data),
  add: (offerId: number) => apiClient.post('/favorites/', { offer: offerId }),
  remove: (favoriteId: number) => apiClient.delete(`/favorites/${favoriteId}/`),
  removeByOffer: (offerId: number) => apiClient.delete(`/favorites/by-offer/${offerId}/`),
}

export const followsApi = {
  list: () => apiClient.get('/follows/').then((r) => r.data),
  add: (businessId: number) => apiClient.post('/follows/', { business: businessId }),
  remove: (followId: number) => apiClient.delete(`/follows/${followId}/`),
  removeByBusiness: (businessId: number) => apiClient.delete(`/follows/by-business/${businessId}/`),
}

export const reviewsApi = {
  list: (businessId: number) =>
    apiClient.get<Paginated<Review>>('/reviews/', { params: { business: businessId } }).then((r) => r.data),
  create: (payload: { business: number; rating: number; comment?: string }) =>
    apiClient.post<Review>('/reviews/', payload).then((r) => r.data),
}

export const reportsApi = {
  create: (payload: { offer: number; reason: string; note?: string }) => apiClient.post('/reports/', payload),
}

export const conversationsApi = {
  list: () => apiClient.get('/conversations/').then((r) => r.data),
  create: (payload: { business: number; offer?: number; product?: number }) =>
    apiClient.post<{ id: number }>('/conversations/', payload).then((r) => r.data),
  messages: (conversationId: number) => apiClient.get(`/conversations/${conversationId}/messages/`).then((r) => r.data),
  sendMessage: (conversationId: number, text: string) =>
    apiClient.post(`/conversations/${conversationId}/messages/`, { text }).then((r) => r.data),
}

export const notificationsApi = {
  list: () => apiClient.get<Paginated<Notification>>('/notifications/').then((r) => r.data),
  markRead: (id: number) => apiClient.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => apiClient.post('/notifications/mark_all_read/'),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread_count/').then((r) => r.data),
}

export const analyticsApi = {
  dashboard: (businessId?: number) =>
    apiClient.get<DashboardStats>('/analytics/dashboard/', { params: { business: businessId } }).then((r) => r.data),
}

interface AuthResponse {
  user: User
  tokens: { access: string; refresh: string }
  created: boolean
}

interface OTPVerificationResponse {
  requires_profile_setup: true
  registration_token: string
}

export interface ShopkeeperLegalStatus {
  accepted: boolean
  terms_version: string
  privacy_policy_version: string
  offer_policy_version: string
  accepted_at: string | null
}

export const authApi = {
  requestOtp: (phoneNumber: string) =>
    apiClient
      .post<{ status: string; expires_in: number; debug_otp?: string }>('/auth/otp/request/', { phone_number: phoneNumber })
      .then((r) => r.data),
  verifyOtp: (payload: { phone_number: string; otp: string; guest_id?: string }) =>
    apiClient.post<AuthResponse | OTPVerificationResponse>('/auth/otp/verify/', payload).then((r) => r.data),
  completeRegistration: (payload: {
    registration_token: string
    username: string
    role: 'customer' | 'shopkeeper'
    guest_id?: string
  }) => apiClient.post<AuthResponse>('/auth/signup/complete/', payload).then((r) => r.data),
  shopkeeperLegalStatus: () => apiClient.get<ShopkeeperLegalStatus>('/auth/shopkeeper-legal/').then((r) => r.data),
  acceptShopkeeperLegal: () => apiClient.post<ShopkeeperLegalStatus>('/auth/shopkeeper-legal/', {
    accept_terms: true,
    accept_privacy_policy: true,
    accept_offer_policy: true,
  }).then((r) => r.data),
  me: () => apiClient.get<User>('/auth/me/').then((r) => r.data),
}
