import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  Search, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  Users, Zap, User, Battery, Calendar, Clock, ChevronRight, UserX, X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail, BatteryData, QueueStatus, StationReservation } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiderLookup { _id: string; fullName: string; phone: string }
interface SwapResult { swapCode: string; _id: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) {
    const mins = Math.abs(Math.floor(diff / 60000))
    return mins < 60 ? `${mins}m overdue` : 'overdue'
  }
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  return `in ${hrs}h ${mins % 60}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
}

function isNearNow(iso: string) {
  const diff = Math.abs(new Date(iso).getTime() - Date.now())
  return diff < 30 * 60 * 1000 // within 30 minutes
}

// ── Success Panel ─────────────────────────────────────────────────────────────

function SuccessPanel({ result, onReset }: { result: SwapResult; onReset: () => void }) {
  const { t } = useLanguage()
  const sw = t.operator.swap
  return (
    <Card className="border-success/40 bg-success/5">
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{sw.successTitle}</h3>
          <p className="text-sm text-gray-600 mt-1">{sw.successDesc}</p>
        </div>
        <div className="inline-block bg-white border rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">{sw.swapCode}</p>
          <p className="font-mono font-bold text-primary">{result.swapCode}</p>
        </div>
        <Button onClick={onReset} className="mt-2">{sw.processAnother}</Button>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type RightTab = 'reservations' | 'queue'

export function SwapProcess() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const sw = t.operator.swap
  const [station, setStation] = useState<StationDetail | null>(null)
  const [queue, setQueue] = useState<QueueStatus | null>(null)
  const [reservations, setReservations] = useState<StationReservation[]>([])
  const [availableBatteries, setAvailableBatteries] = useState<BatteryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('reservations')
  const [reservationSearch, setReservationSearch] = useState('')

  // Form state
  const [riderPhone, setRiderPhone] = useState('')
  const [rider, setRider] = useState<RiderLookup | null>(null)
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null)
  const [riderError, setRiderError] = useState('')
  const [lookingUpRider, setLookingUpRider] = useState(false)
  const [depletedBattery, setDepletedBattery] = useState('')
  // _id resolved from auto-lookup or search — used for submission instead of serial string
  const [depletedBatteryResolvedId, setDepletedBatteryResolvedId] = useState<string | null>(null)
  const [depletedBatterySuggestion, setDepletedBatterySuggestion] = useState<{ serialNumber: string; chargeLevel: number } | null>(null)
  const [chargedBattery, setChargedBattery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStation = useCallback(async () => {
    const stations = await api.get<StationDetail[]>('/stations')
    return (stations ?? []).find(
      (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
    ) ?? null
  }, [user?._id])

  const loadQueue = useCallback(async (stationId: string) => {
    try {
      const q = await api.get<QueueStatus>(`/queue/${stationId}`)
      setQueue(q)
    } catch { /* ignore */ }
  }, [])

  const loadReservations = useCallback(async (stationId: string) => {
    try {
      const result = await api.get<any>(`/stations/${stationId}/reservations?upcoming=true&limit=100`)
      setReservations(result?.reservations ?? [])
    } catch { /* ignore */ }
  }, [])

  const loadAvailableBatteries = useCallback(async (stationId: string) => {
    try {
      const result = await api.get<any>(`/batteries?stationId=${stationId}&status=available&limit=50`)
      setAvailableBatteries(result?.batteries ?? result ?? [])
    } catch { /* ignore */ }
  }, [])

  const initialLoad = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loadStation()
      if (!s) throw new Error('No station assigned to your account')
      setStation(s)
      await Promise.all([
        loadQueue(s._id),
        loadReservations(s._id),
        loadAvailableBatteries(s._id),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadQueue, loadReservations, loadAvailableBatteries])

  useEffect(() => { initialLoad() }, [initialLoad])

  // 30-second polling for queue and reservations
  useEffect(() => {
    if (!station) return
    pollRef.current = setInterval(() => {
      loadQueue(station._id)
      loadReservations(station._id)
      loadAvailableBatteries(station._id)
    }, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [station, loadQueue, loadReservations, loadAvailableBatteries])

  const fetchLastBattery = useCallback(async (riderId: string) => {
    setDepletedBatterySuggestion(null)
    setDepletedBatteryResolvedId(null)
    try {
      const battery = await api.get<{ _id: string; serialNumber: string; chargeLevel: number } | null>(
        `/swaps/rider/${riderId}/last-battery`
      )
      if (battery?.serialNumber) {
        setDepletedBatterySuggestion(battery)
        setDepletedBattery(battery.serialNumber)
        setDepletedBatteryResolvedId(battery._id)  // store the real ObjectId
      }
    } catch { /* silently ignore — field stays blank for manual entry */ }
  }, [])

  const lookupRider = async () => {
    if (!riderPhone.trim()) { setRiderError(sw.step1Error); return }
    setLookingUpRider(true)
    setRiderError('')
    setRider(null)
    setActiveReservationId(null)
    setDepletedBatterySuggestion(null)
    setDepletedBattery('')
    try {
      const found = await api.get<RiderLookup>(`/operators/rider-lookup?phone=${encodeURIComponent(riderPhone.trim())}`)
      setRider(found)
      fetchLastBattery(found._id)
    } catch (err: any) {
      setRiderError(err.message || 'Rider not found')
    } finally {
      setLookingUpRider(false)
    }
  }

  // Called when operator clicks "Process" on a reservation
  const handleProcessReservation = (res: StationReservation) => {
    const riderObj = res.riderId as { _id: string; fullName: string; phone: string }
    setRider({
      _id: riderObj._id,
      fullName: riderObj.fullName,
      phone: riderObj.phone ?? '',
    })
    setActiveReservationId(res._id)
    setRiderPhone(riderObj.phone ?? '')
    setDepletedBattery('')
    setDepletedBatteryResolvedId(null)
    setDepletedBatterySuggestion(null)
    setFormError('')
    setRiderError('')

    // If a battery was pre-held for this reservation, inject it into the
    // available list (it has status 'reserved' so the API won't return it)
    // and pre-select it so the operator just needs to confirm.
    const held = res.heldBatteryId
    if (held?._id) {
      setChargedBattery(held._id)
      setAvailableBatteries((prev) => {
        if (prev.some((b) => b._id === held._id)) return prev
        return [
          {
            _id: held._id,
            serialNumber: held.serialNumber,
            chargeLevel: held.chargeLevel,
            status: 'reserved' as const,
            stationId: undefined,
            isFaulty: false,
            repairCount: 0,
            createdAt: '',
            updatedAt: '',
          },
          ...prev,
        ]
      })
    } else {
      setChargedBattery('')
    }

    fetchLastBattery(riderObj._id)
  }

  // Called when operator removes a rider from the live queue
  const handleRemoveFromQueue = async (riderId: string) => {
    if (!station) return
    try {
      await api.delete(`/queue/${station._id}/riders/${riderId}`)
      await loadQueue(station._id)
    } catch { /* ignore — queue will refresh on next poll */ }
  }

  // Called when operator clicks "Select" in the live queue
  const handleProcessQueueRider = (riderId: string) => {
    setRider({ _id: riderId, fullName: `Rider …${riderId.slice(-6)}`, phone: '' })
    setActiveReservationId(null)
    setDepletedBattery('')
    setDepletedBatteryResolvedId(null)
    setDepletedBatterySuggestion(null)
    setChargedBattery('')
    setFormError('')
    fetchLastBattery(riderId)
  }

  const handleSubmit = async () => {
    if (!rider)                   { setFormError(sw.errNoRider); return }
    if (!depletedBattery.trim())  { setFormError(sw.errNoDepleted); return }
    if (!chargedBattery)          { setFormError(sw.errNoCharged); return }
    if (!station) return

    setSubmitting(true)
    setFormError('')
    try {
      // Resolve depleted battery ObjectId ─────────────────────────────────────
      // Priority 1: already resolved from auto-lookup (fetchLastBattery)
      let depBatteryId = depletedBatteryResolvedId

      if (!depBatteryId) {
        // Priority 2: search across ALL batteries by serial (no stationId filter —
        // the depleted battery is with the rider, not at the station)
        const searchResult = await api.get<any>(
          `/batteries?search=${encodeURIComponent(depletedBattery.trim())}&limit=1`
        )
        const found = searchResult?.batteries ?? searchResult ?? []
        depBatteryId = found[0]?._id ?? null
      }

      if (!depBatteryId) {
        setFormError(`Battery "${depletedBattery.trim()}" not found in the system. Verify the serial number.`)
        setSubmitting(false)
        return
      }

      const result = await api.post<SwapResult>('/swaps/complete', {
        riderId: rider._id,
        stationId: station._id,
        depletedBatteryId: depBatteryId,
        chargedBatteryId: chargedBattery,
      })
      setSwapResult(result)

      // Mark the reservation completed (not cancelled — the swap was fulfilled)
      if (activeReservationId) {
        try {
          await api.patch(`/swaps/reserve/${activeReservationId}/complete`)
        } catch { /* best-effort — reservation will auto-expire if this fails */ }
      }

      await Promise.all([
        loadQueue(station._id),
        loadReservations(station._id),
        loadAvailableBatteries(station._id),
      ])
      const s = await loadStation()
      if (s) setStation(s)
    } catch (err: any) {
      // Extract the backend's actual error message from the Axios response envelope
      const msg = err?.response?.data?.message || err?.message || 'Failed to complete swap'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setRiderPhone('')
    setRider(null)
    setActiveReservationId(null)
    setRiderError('')
    setDepletedBattery('')
    setDepletedBatteryResolvedId(null)
    setDepletedBatterySuggestion(null)
    setChargedBattery('')
    setFormError('')
    setSwapResult(null)
  }

  const handleRightTabChange = (newTab: RightTab) => {
    setRightTab(newTab)
    setReservationSearch('')
  }

  const filteredReservations = reservationSearch.trim()
    ? reservations.filter((res) => {
        const q = reservationSearch.trim().toLowerCase()
        const riderObj = res.riderId as { _id: string; fullName: string; phone: string }
        return (
          riderObj?.fullName?.toLowerCase().includes(q) ||
          riderObj?.phone?.includes(q) ||
          res.cancellationCode?.toLowerCase().includes(q)
        )
      })
    : reservations

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const queueCount = queue?.length ?? 0
  const reservationCount = reservations.length

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sw.title}</h1>
            <p className="text-gray-600 mt-1">{sw.subtitle}</p>
          </div>
          <button
            onClick={initialLoad}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={initialLoad} className="ml-auto text-error">{sw.retry}</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Left: swap form or success ── */}
          {swapResult ? (
            <SuccessPanel result={swapResult} onReset={resetForm} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{sw.newTransaction}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Active reservation banner */}
                {activeReservationId && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-primary font-medium">{sw.fromReservation}</span>
                  </div>
                )}

                {/* Held battery banner — shown when a battery was pre-reserved for this rider */}
                {activeReservationId && chargedBattery && availableBatteries.find(b => b._id === chargedBattery && b.status === 'reserved') && (
                  <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm">
                    <Battery className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <span className="text-success font-medium">Battery pre-held for this rider</span>
                      {availableBatteries.find(b => b._id === chargedBattery) && (
                        <span className="text-gray-600 ml-1.5 font-mono text-xs">
                          {availableBatteries.find(b => b._id === chargedBattery)!.serialNumber}
                          {' '}({availableBatteries.find(b => b._id === chargedBattery)!.chargeLevel}% charged)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 1: Rider */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{sw.step1}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={sw.step1Placeholder}
                      value={riderPhone}
                      onChange={(e) => {
                        setRiderPhone(e.target.value)
                        if (!activeReservationId) { setRider(null); setRiderError('') }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && lookupRider()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={lookupRider}
                      disabled={lookingUpRider}
                      className="shrink-0"
                    >
                      {lookingUpRider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {riderError && <p className="text-xs text-error">{riderError}</p>}
                  {rider && (
                    <div className="flex items-center gap-2 p-2.5 bg-success/5 border border-success/20 rounded-lg">
                      <div className="w-7 h-7 bg-success/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rider.fullName}</p>
                        {rider.phone && <p className="text-xs text-gray-500">{rider.phone}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Depleted battery */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{sw.step2}</Label>
                  {depletedBatterySuggestion && (
                    <div className="flex items-center gap-2 p-2.5 bg-warning/5 border border-warning/20 rounded-lg text-xs">
                      <Battery className="w-3.5 h-3.5 text-warning shrink-0" />
                      <span className="text-gray-600">
                        {sw.lastBatteryHint}{' '}
                        <span className="font-mono font-semibold text-gray-900">
                          {depletedBatterySuggestion.serialNumber}
                        </span>
                        {' '}({depletedBatterySuggestion.chargeLevel}% {sw.lastBatteryWhen})
                      </span>
                    </div>
                  )}
                  <Input
                    placeholder={sw.step2Placeholder}
                    value={depletedBattery}
                    onChange={(e) => {
                      setDepletedBattery(e.target.value)
                      // clear the resolved ID — it will be re-resolved via search on submit
                      setDepletedBatteryResolvedId(null)
                      if (depletedBatterySuggestion && e.target.value !== depletedBatterySuggestion.serialNumber) {
                        setDepletedBatterySuggestion(null)
                      }
                    }}
                  />
                </div>

                {/* Step 3: Charged battery */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{sw.step3}</Label>
                  {availableBatteries.length === 0 ? (
                    <p className="text-sm text-warning flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      {sw.noCharged}
                    </p>
                  ) : (
                    <Select
                      value={chargedBattery}
                      onChange={(e) => setChargedBattery(e.target.value)}
                    >
                      <option value="">{sw.selectCharged}</option>
                      {availableBatteries.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.serialNumber} — {sw.chargedOption.replace('{n}', String(b.chargeLevel))}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                {formError && (
                  <p className="text-sm text-error flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !rider || !depletedBattery || !chargedBattery}
                  className="w-full"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />{sw.processing}</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />{sw.completeSwap}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Right: Reservations + Queue ── */}
          <Card>
            {/* Tab bar */}
            <div className="flex border-b px-4 pt-4">
              <button
                onClick={() => handleRightTabChange('reservations')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  rightTab === 'reservations'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {sw.tabReservations}
                {reservationCount > 0 && (
                  <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    rightTab === 'reservations' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {reservationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleRightTabChange('queue')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  rightTab === 'queue'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {sw.tabQueue}
                {queueCount > 0 && (
                  <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    rightTab === 'queue' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {queueCount}
                  </span>
                )}
              </button>
            </div>

            <CardContent className="pt-4">

              {/* ── Reservations tab ── */}
              {rightTab === 'reservations' && (
                <>
                  {reservations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">{sw.noReservations}</p>
                      <p className="text-xs text-gray-400">{sw.noReservationsDesc}</p>
                    </div>
                  ) : (
                    <>
                      {/* Search bar */}
                      <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <Input
                          placeholder={sw.resSearchPlaceholder}
                          value={reservationSearch}
                          onChange={(e) => setReservationSearch(e.target.value)}
                          className="pl-8 h-8 text-sm pr-8"
                          aria-label="Search reservations"
                        />
                        {reservationSearch && (
                          <button
                            onClick={() => setReservationSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Match count when filtering */}
                      {reservationSearch && (
                        <p className="text-xs text-gray-500 mb-2">
                          {filteredReservations.length} of {reservations.length} {sw.resSearchCount}
                        </p>
                      )}

                      {/* No match */}
                      {filteredReservations.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Search className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-600">{sw.resNoMatch}</p>
                          <button
                            onClick={() => setReservationSearch('')}
                            className="text-xs text-primary hover:underline"
                          >
                            {sw.resClearSearch}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                          {filteredReservations.map((res) => {
                            const riderObj = res.riderId as { _id: string; fullName: string; phone: string }
                            const near = isNearNow(res.reservedTime)
                            const isActive = activeReservationId === res._id
                            return (
                              <div
                                key={res._id}
                                className={`p-3 border rounded-xl transition-colors ${
                                  isActive
                                    ? 'border-primary bg-primary/5'
                                    : near
                                    ? 'border-warning/50 bg-warning/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {riderObj?.fullName ?? 'Unknown Rider'}
                                      </p>
                                      {riderObj?.phone && (
                                        <p className="text-xs text-gray-500">{riderObj.phone}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Clock className="w-3 h-3" />
                                          {formatTime(res.reservedTime)}
                                        </div>
                                        <span className={`text-xs font-medium ${
                                          new Date(res.reservedTime).getTime() < Date.now()
                                            ? 'text-error'
                                            : near
                                            ? 'text-warning'
                                            : 'text-gray-500'
                                        }`}>
                                          {timeUntil(res.reservedTime)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                                        {sw.resCode} {res.cancellationCode}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={isActive ? 'default' : 'outline'}
                                    onClick={() => handleProcessReservation(res)}
                                    className="shrink-0 text-xs"
                                  >
                                    {isActive ? (
                                      sw.resSelected
                                    ) : (
                                      <>{sw.resProcess} <ChevronRight className="w-3 h-3 ml-0.5" /></>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Queue tab ── */}
              {rightTab === 'queue' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      {queueCount} {sw.queueWaiting} · ~{queue?.estimatedWait ?? 0} {sw.queueEstMin}
                    </p>
                    <button
                      onClick={() => station && loadQueue(station._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                      aria-label="Refresh queue"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!queue || queueCount === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">{sw.queueEmpty}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {queue.queue.map((riderId, idx) => (
                        <div
                          key={riderId}
                          className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{idx + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">{sw.queueRider}{idx + 1}</p>
                              <p className="text-xs text-gray-400 font-mono">…{riderId.slice(-8)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessQueueRider(riderId)}
                              className="text-xs"
                            >
                              {sw.queueSelect}
                            </Button>
                            <button
                              onClick={() => handleRemoveFromQueue(riderId)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-error/5 transition-colors"
                              title="Remove from queue"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Battery stock summary — always visible */}
              {station && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Battery className="w-4 h-4 text-success" />
                    <span>{station.availableBatteries} {t.operator.dashboard.available}</span>
                  </div>
                  <Badge variant={station.availableBatteries > station.lowInventoryThreshold ? 'success' : 'warning'}>
                    {station.availableBatteries > station.lowInventoryThreshold ? sw.goodStock : sw.lowStock}
                  </Badge>
                </div>
              )}

            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}
