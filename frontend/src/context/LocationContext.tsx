import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface LocationState {
  city: string
  latitude: number | null
  longitude: number | null
  locationUpdatedAt: number | null
}

interface LocationContextValue extends LocationState {
  setCity: (city: string) => void
  setCoords: (lat: number, lng: number) => void
  requestBrowserLocation: () => void
  locating: boolean
}

const STORAGE_KEY = 'lo_location'

const DEFAULT_LOCATION: LocationState = {
  city: 'Bhopal',
  latitude: 23.2599,
  longitude: 77.4126,
  locationUpdatedAt: null,
}
const LOCATION_REFRESH_AGE_MS = 15 * 60 * 1000
const GEOLOCATION_CACHE_AGE_MS = 10 * 60 * 1000

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return DEFAULT_LOCATION

      const stored: unknown = JSON.parse(raw)
      if (!stored || typeof stored !== 'object') return DEFAULT_LOCATION

      const location = stored as Partial<LocationState>
      if (
        typeof location.city !== 'string' ||
        (location.latitude !== null && typeof location.latitude !== 'number') ||
        (location.longitude !== null && typeof location.longitude !== 'number')
      ) return DEFAULT_LOCATION

      return {
        city: location.city,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        locationUpdatedAt: Number.isFinite(location.locationUpdatedAt) ? location.locationUpdatedAt! : null,
      }
    } catch {
      return DEFAULT_LOCATION
    }
  })
  const [locating, setLocating] = useState(false)

  const persist = useCallback((next: LocationState) => {
    setState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Keep the current-session location even when browser storage is unavailable.
    }
  }, [])

  const setCity = useCallback((city: string) => persist({ ...state, city }), [persist, state])
  const setCoords = useCallback(
    (lat: number, lng: number) =>
      persist({ ...state, latitude: lat, longitude: lng, locationUpdatedAt: Date.now() }),
    [persist, state]
  )

  const saveDevicePosition = useCallback((position: GeolocationPosition) => {
    setState((current) => {
      const next = {
        ...current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationUpdatedAt: Date.now(),
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Keep the current-session location even when browser storage is unavailable.
      }
      return next
    })
  }, [])

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        saveDevicePosition(position)
        setLocating(false)
      },
      () => setLocating(false),
      { maximumAge: GEOLOCATION_CACHE_AGE_MS, timeout: 8000, enableHighAccuracy: false }
    )
  }, [saveDevicePosition])

  useEffect(() => {
    if (state.locationUpdatedAt && Date.now() - state.locationUpdatedAt < LOCATION_REFRESH_AGE_MS) return
    if (!navigator.geolocation || !navigator.permissions?.query) return

    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (cancelled || permission.state !== 'granted') return
        navigator.geolocation.getCurrentPosition(
          saveDevicePosition,
          () => {},
          { maximumAge: GEOLOCATION_CACHE_AGE_MS, timeout: 5000, enableHighAccuracy: false }
        )
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [state.locationUpdatedAt, saveDevicePosition])

  const value = useMemo(
    () => ({ ...state, setCity, setCoords, requestBrowserLocation, locating }),
    [state, setCity, setCoords, requestBrowserLocation, locating]
  )
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationContext() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider')
  return ctx
}
