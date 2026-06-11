import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api'
import type { SlotReservationDetail } from '../types'

interface UseReservationsReturn {
  reservations: SlotReservationDetail[]
  isLoading: boolean
  error: string | null
  refresh: () => void
  cancelReservation: (id: string) => Promise<void>
  isCancelling: string | null
}

export function useReservations(): UseReservationsReturn {
  const [reservations, setReservations] = useState<SlotReservationDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<SlotReservationDetail[]>('/swaps/my-reservations')
      setReservations(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const cancelReservation = useCallback(async (id: string) => {
    setIsCancelling(id)
    try {
      await api.delete(`/swaps/reserve/${id}`)
      setReservations((prev) => prev.filter((r) => r._id !== id))
    } finally {
      setIsCancelling(null)
    }
  }, [])

  return { reservations, isLoading, error, refresh: fetch, cancelReservation, isCancelling }
}
