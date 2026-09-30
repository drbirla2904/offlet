import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const ACCESS_KEY = 'lo_access_token'
const REFRESH_KEY = 'lo_refresh_token'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const apiClient = axios.create({ baseURL: API_BASE_URL })

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
    localStorage.setItem(ACCESS_KEY, data.access)
    return data.access as string
  } catch {
    tokenStore.clear()
    return null
  }
}

// Signal the app to show the "Login to continue" modal instead of a hard
// redirect, per the product spec's guest-first rule.
export const LOGIN_REQUIRED_EVENT = 'lo:login-required'

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh()) {
      original._retry = true
      if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null })
      const newAccess = await refreshing
      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(original)
      }
    }
    if (error.response?.status === 401 || error.response?.data?.code === 'login_required') {
      window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT))
    }
    return Promise.reject(error)
  }
)
