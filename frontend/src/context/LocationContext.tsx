import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface LocationState {
  city: string
  latitude: number | null
  longitude: number | null
}

interface LocationContextValue extends LocationState {
  setCity: (city: string) => void
  setCoords: (lat: number, lng: number) => void
  requestBrowserLocation: () => void
  locating: boolean
}

const STORAGE_KEY = 'lo_location'

const DEFAULT_LOCATION: LocationState = { city: 'Bhopal', latitude: 23.2599, longitude: 77.4126 }

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_LOCATION
  })
  const [locating, setLocating] = useState(false)

  const persist = (next: LocationState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const setCity = (city: string) => persist({ ...state, city })
  const setCoords = (lat: number, lng: number) => persist({ ...state, latitude: lat, longitude: lng })

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persist({ ...state, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  const value = useMemo(
    () => ({ ...state, setCity, setCoords, requestBrowserLocation, locating }),
    [state, locating]
  )
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationContext() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider')
  return ctx
}
