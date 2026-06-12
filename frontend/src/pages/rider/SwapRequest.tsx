import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  Battery, MapPin, Clock, CheckCircle, AlertCircle,
  XCircle, RefreshCw, Loader2, CalendarClock, Info,
  Users, LogIn, LogOut, Zap,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useReservations } from '../../hooks/useReservations'
import type { Station, SlotReservationDetail } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ── Confirmation Card ─────────────────────────────────────────────────────────

interface Confirmation {
  _id: string
  stationName: string
  reservedTime: string
  cancellationCode: string
  queuePosition?: number
}

function ConfirmationPanel({ confirmation, onDone }: { confirmation: Confirmation; onDone: () => void }) {
  return (
    <Card className="border-success border-2">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Reservation Confirmed!</h3>
            <p className="text-gray-600 mt-1 text-sm">Show this code to the station operator</p>
          </div>

          <div className="w-full bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Station</span>
              <span className="font-semibold text-gray-900">{confirmation.stationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-gray-900">{formatDateTime(confirmation.reservedTime)}</span>
            </div>
            {confirmation.queuePosition && (
              <div className="flex justify-between">
                <span className="text-gray-500">Queue Position</span>
                <span className="font-semibold text-gray-900">#{confirmation.queuePosition}</span>
              </div>
            )}
          </div>

          <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Cancellation Code</p>
            <p className="text-3xl font-mono font-bold text-primary tracking-widest">
              {confirmation.cancellationCode}
            </p>
          </div>

          <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg p-3 text-left">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Your slot is held for 15 minutes after your reserved time. The operator will use this code to process your swap.
            </p>
          </div>

          <Button onClick={onDone} className="w-full">
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Active Reservation Row ────────────────────────────────────────────────────

function ReservationRow({
  reservation,
  onCancel,
  isCancelling,
}: {
  reservation: SlotReservationDetail
  onCancel: (id: string) => void
  isCancelling: boolean
}) {
  return (
    <div className="flex items-start justify-between p-4 border border-gray-100 rounded-xl hover:border-primary/30 transition-colors bg-white">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <CalendarClock className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            {reservation.stationId?.name || 'Unknown Station'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(reservation.reservedTime)}
          </p>
          <p className="text-xs font-mono text-primary mt-1">
            Code: {reservation.cancellationCode}
          </p>
          {reservation.queuePosition && (
            <p className="text-xs text-gray-400 mt-0.5">Queue #{reservation.queuePosition}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCancel(reservation._id)}
        disabled={isCancelling}
        className="text-xs text-error hover:text-error font-medium hover:underline transition-colors disabled:opacity-50 shrink-0 ml-2"
        aria-label="Cancel reservation"
      >
        {isCancelling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Cancel'
        )}
      </button>
    </div>
  )
}

// ── Guidance Steps ────────────────────────────────────────────────────────────

function GuidanceSteps({ steps }: { steps: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How It Works</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// ── Walk-In Queue Card ────────────────────────────────────────────────────────

interface QueueState {
  position: number
  estimatedWait: number
  stationId: string
  stationName: string
}

function WalkInQueueCard({ stations }: { stations: Station[] }) {
  const [selectedStationId, setSelectedStationId] = useState('')
  const [queueInfo, setQueueInfo] = useState<{ length: number; estimatedWait: number } | null>(null)
  const [myQueue, setMyQueue] = useState<QueueState | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(true)  // checking queue position on mount
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount: check if this rider is already in a queue (survives logout/login)
  useEffect(() => {
    const restore = async () => {
      try {
        const data = await api.get<{
          stationId: string; stationName: string; position: number; estimatedWait: number
        } | null>('/queue/my-position')
        if (data && (data as any).stationId) {
          const d = data as any
          setMyQueue({
            position: d.position,
            estimatedWait: d.estimatedWait,
            stationId: d.stationId,
            stationName: d.stationName,
          })
          setSelectedStationId(d.stationId)
        }
      } catch { /* not in any queue */ }
      finally { setRestoring(false) }
    }
    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load queue status for the selected station
  const loadQueueInfo = useCallback(async (stationId: string) => {
    if (!stationId) return
    setLoading(true)
    try {
      const data = await api.get<{ queue: string[]; length: number; estimatedWait: number }>(
        `/queue/${stationId}`
      )
      setQueueInfo({ length: (data as any).length ?? 0, estimatedWait: (data as any).estimatedWait ?? 0 })
    } catch {
      setQueueInfo(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll every 15 seconds when viewing a station's queue
  useEffect(() => {
    if (!selectedStationId) return
    loadQueueInfo(selectedStationId)
    pollRef.current = setInterval(async () => {
      loadQueueInfo(selectedStationId)
      // Refresh own position if in queue at this station
      if (myQueue?.stationId === selectedStationId) {
        try {
          const pos = await api.get<any>('/queue/my-position')
          if (pos && (pos as any).stationId) {
            const p = pos as any
            setMyQueue((prev) => prev ? { ...prev, position: p.position, estimatedWait: p.estimatedWait } : prev)
          }
        } catch { /* ignore */ }
      }
    }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedStationId, loadQueueInfo, myQueue?.stationId])

  const handleStationChange = (id: string) => {
    setSelectedStationId(id)
    setQueueInfo(null)
    setError('')
  }

  const handleJoin = async () => {
    if (!selectedStationId) return
    setJoining(true)
    setError('')
    try {
      const data = await api.post<{ position: number; estimatedWait: number }>(
        `/queue/${selectedStationId}/join`,
        {}
      )
      const station = stations.find((s) => s._id === selectedStationId)
      setMyQueue({
        position: (data as any).position,
        estimatedWait: (data as any).estimatedWait,
        stationId: selectedStationId,
        stationName: station?.name ?? 'Station',
      })
      loadQueueInfo(selectedStationId)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to join queue')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!myQueue) return
    setLeaving(true)
    setError('')
    try {
      await api.delete(`/queue/${myQueue.stationId}/leave`)
      setMyQueue(null)
      loadQueueInfo(myQueue.stationId)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to leave queue')
    } finally {
      setLeaving(false)
    }
  }

  const activeStations = stations.filter((s) => s.availableBatteries > 0)

  if (restoring) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking queue status…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Walk-In Queue
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Already at a station? Join the live queue</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Active queue status — shown if rider is already in a queue */}
        {myQueue && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {myQueue.position}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">You're #{myQueue.position} in line</p>
                  <p className="text-xs text-gray-500">{myQueue.stationName}</p>
                </div>
              </div>
              <Badge variant="default" className="text-xs">In Queue</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              Estimated wait: ~{myQueue.estimatedWait} min
            </div>
            <div className="flex items-start gap-2 bg-white/60 rounded-lg p-2.5 text-xs text-gray-600">
              <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              Go to the operator and say your name. They will call you when it's your turn.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              disabled={leaving}
              className="w-full text-error border-error/20 hover:bg-error/5"
            >
              {leaving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Leaving…</>
                : <><LogOut className="w-3.5 h-3.5 mr-1.5" />Leave Queue</>
              }
            </Button>
          </div>
        )}

        {!myQueue && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Select station you're at</Label>
              <select
                value={selectedStationId}
                onChange={(e) => handleStationChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Choose a station…</option>
                {activeStations.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — {s.availableBatteries} batteries available
                  </option>
                ))}
              </select>
            </div>

            {/* Queue info for selected station */}
            {selectedStationId && (
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Loading queue…</span>
                  </div>
                ) : queueInfo ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium">{queueInfo.length}</span>
                        <span className="text-gray-500 text-xs">waiting</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        ~{queueInfo.estimatedWait} min
                      </div>
                    </div>
                    <button
                      onClick={() => loadQueueInfo(selectedStationId)}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Could not load queue info</span>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-error flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </p>
            )}

            <Button
              onClick={handleJoin}
              disabled={!selectedStationId || joining}
              className="w-full"
            >
              {joining
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Joining…</>
                : <><LogIn className="w-4 h-4 mr-2" />Join Queue</>
              }
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Only join if you're physically at the station
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page Component ─────────────────────────────────────────────────────────────

export function SwapRequest() {
  // ── External state ──
  const { reservations, isLoading: reservLoading, refresh: refreshReservations, cancelReservation, isCancelling } = useReservations()

  // ── Local state ──
  const [stations, setStations] = useState<Station[]>([])
  const [stationsLoading, setStationsLoading] = useState(true)
  const [guidanceSteps, setGuidanceSteps] = useState<string[]>([])

  const [form, setForm] = useState({ stationId: '', reservedTime: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  // ── Date/time helpers ──
  const minDateTime = toInputValue(new Date(Date.now() - 5 * 60 * 1000))
  const maxDateTime = toInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000))

  // ── Load stations and guidance ──
  const loadStations = useCallback(async () => {
    setStationsLoading(true)
    try {
      const data = await api.get<Station[]>('/stations?status=active')
      setStations(Array.isArray(data) ? data : [])
    } catch {
      setStations([])
    } finally {
      setStationsLoading(false)
    }
  }, [])

  const loadGuidance = useCallback(async () => {
    try {
      const data = await api.get<string[]>('/swaps/guidance?lang=en')
      if (Array.isArray(data)) setGuidanceSteps(data)
    } catch {
      setGuidanceSteps([
        'Show your confirmation code to the station operator',
        'Hand over your depleted battery',
        'Receive your fully charged battery',
        'Confirm the swap on the app',
        'Proceed to payment',
      ])
    }
  }, [])

  useEffect(() => {
    loadStations()
    loadGuidance()
  }, [loadStations, loadGuidance])

  // ── Handle reservation submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!form.stationId) { setSubmitError('Please select a station'); return }
    if (!form.reservedTime) { setSubmitError('Please select a time'); return }

    const selectedTime = new Date(form.reservedTime)
    if (selectedTime < new Date(Date.now() - 5 * 60 * 1000)) {
      setSubmitError('Please select a time no more than 5 minutes in the past')
      return
    }
    if (selectedTime > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      setSubmitError('Reservations can only be made up to 24 hours in advance')
      return
    }

    setIsSubmitting(true)
    try {
      const data = await api.post<SlotReservationDetail>('/swaps/reserve', {
        stationId: form.stationId,
        reservedTime: selectedTime.toISOString(),
      })

      const station = stations.find((s) => s._id === form.stationId)
      setConfirmation({
        _id: data._id,
        stationName: station?.name || 'Station',
        reservedTime: data.reservedTime,
        cancellationCode: data.cancellationCode,
        queuePosition: data.queuePosition,
      })
      setForm({ stationId: '', reservedTime: '' })
      refreshReservations()
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to create reservation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelConfirm = () => setConfirmation(null)

  const selectedStation = stations.find((s) => s._id === form.stationId)
  const hasActiveReservation = reservations.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Battery Swap</h1>
            <p className="text-gray-600 mt-1">Reserve a slot or join the walk-in queue</p>
          </div>
          <button
            onClick={() => { loadStations(); refreshReservations() }}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left: Form or Confirmation ── */}
          <div className="lg:col-span-2 space-y-6">

            {confirmation ? (
              <ConfirmationPanel confirmation={confirmation} onDone={handleCancelConfirm} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Reserve a Slot</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Book ahead — up to 24 hours in advance</p>
                </CardHeader>
                <CardContent>

                  {/* Active reservation warning */}
                  {hasActiveReservation && (
                    <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning mb-6">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        You already have an active reservation. Cancel it below before creating a new one.
                      </span>
                    </div>
                  )}

                  {submitError && (
                    <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error mb-6">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={handleSubmit} noValidate>

                    {/* Station Select */}
                    <div className="space-y-2">
                      <Label htmlFor="station">Select Station</Label>
                      {stationsLoading ? (
                        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        <Select
                          id="station"
                          value={form.stationId}
                          onChange={(e) => setForm((f) => ({ ...f, stationId: e.target.value }))}
                          disabled={hasActiveReservation}
                        >
                          <option value="">Choose a station…</option>
                          {stations.map((s) => (
                            <option key={s._id} value={s._id} disabled={s.availableBatteries === 0}>
                              {s.name}{s.availableBatteries === 0 ? ' — No batteries available' : ` — ${s.availableBatteries} available`}
                            </option>
                          ))}
                        </Select>
                      )}
                      {selectedStation && (
                        <div className="flex items-center gap-4 px-1 mt-1">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${selectedStation.availableBatteries > 0 ? 'text-success' : 'text-error'}`}>
                            <Battery className="w-3.5 h-3.5" />
                            <span>{selectedStation.availableBatteries} batteries available</span>
                          </div>
                          {selectedStation.address && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{selectedStation.address}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Date/Time Picker */}
                    <div className="space-y-2">
                      <Label htmlFor="reservedTime">Preferred Time</Label>
                      <input
                        id="reservedTime"
                        type="datetime-local"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        min={minDateTime}
                        max={maxDateTime}
                        value={form.reservedTime}
                        onChange={(e) => setForm((f) => ({ ...f, reservedTime: e.target.value }))}
                        disabled={hasActiveReservation}
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Slots can be reserved up to 24 hours in advance
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting || hasActiveReservation || stationsLoading}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reserving…</>
                      ) : (
                        <><Battery className="w-4 h-4 mr-2" /> Reserve Slot</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Walk-In Queue */}
            {!stationsLoading && stations.length > 0 && (
              <WalkInQueueCard stations={stations} />
            )}

            {/* ── Guidance Steps ── */}
            {guidanceSteps.length > 0 && <GuidanceSteps steps={guidanceSteps} />}
          </div>

          {/* ── Right: Active Reservations ── */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Reservations</CardTitle>
                  {!reservLoading && reservations.length > 0 && (
                    <Badge variant="default" className="text-xs">{reservations.length}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {reservLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CalendarClock className="w-9 h-9 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No active reservations</p>
                    <p className="text-xs text-gray-500">Make a reservation using the form</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((r) => (
                      <ReservationRow
                        key={r._id}
                        reservation={r}
                        onCancel={cancelReservation}
                        isCancelling={isCancelling === r._id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station count info */}
            {!stationsLoading && stations.length > 0 && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {stations.filter((s) => s.availableBatteries > 0).length} of {stations.length} stations have available batteries
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
