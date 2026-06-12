import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  Battery, MapPin, Clock, CheckCircle, AlertCircle,
  XCircle, RefreshCw, Loader2, CalendarClock, Info,
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
  // Allow picking times from 5 minutes ago so "now" is always selectable,
  // even if the user spends a few seconds reading the form before submitting.
  const minDateTime = toInputValue(new Date(Date.now() - 5 * 60 * 1000))
  const maxDateTime = toInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))

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
    // Allow up to 5 minutes in the past to account for form fill time
    if (selectedTime < new Date(Date.now() - 5 * 60 * 1000)) {
      setSubmitError('Please select a time no more than 5 minutes in the past')
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
            <h1 className="text-3xl font-bold text-gray-900">Request Battery Swap</h1>
            <p className="text-gray-600 mt-1">Reserve your battery swap slot at a nearby station</p>
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
                  <CardTitle>New Swap Request</CardTitle>
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
                      {/* Station availability info */}
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
                        Slots can be reserved up to 2 hours in advance
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
