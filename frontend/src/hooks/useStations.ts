import { useState, useEffect, useMemo, useCallback } from 'react'
import { stationService, type RiderLocation } from '../services/stationService'
import type { StationCardData } from '../types'

interface UseStationsReturn {
  /** Card-ready station list (filtered by current search) */
  stations: StationCardData[]
  /** All loaded stations (unfiltered) */
  allStations: StationCardData[]
  /** Current search input value */
  searchQuery: string
  /** Rider's resolved GPS position, or null */
  riderLocation: RiderLocation | null
  /** True while the initial fetch + geolocation is in progress */
  isLoading: boolean
  /** Error message if the fetch failed */
  error: string | null
  /** Update the search query (filters client-side) */
  setSearchQuery: (query: string) => void
  /** Re-fetch everything from scratch */
  refresh: () => void
}

export function useStations(): UseStationsReturn {
  const [allStations, setAllStations] = useState<StationCardData[]>([])
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { cards, riderLocation: loc } = await stationService.loadStationCards()
      setAllStations(cards)
      setRiderLocation(loc)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load stations'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stations = useMemo(
    () => stationService.filterBySearch(allStations, searchQuery),
    [allStations, searchQuery]
  )

  return {
    stations,
    allStations,
    searchQuery,
    riderLocation,
    isLoading,
    error,
    setSearchQuery,
    refresh: load,
  }
}
