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
  Users, Zap, User, Battery,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { StationDetail, BatteryData, QueueStatus } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiderLookup { _id: string; fullName: string; phone: string }
interface SwapResult { swapCode: string; _id: string }

// ── Success Panel ─────────────────────────────────────────────────────────────

function SuccessPanel({ result, onReset }: { result: SwapResult; onReset: () => void }) {
  return (
    <Card className="border-success/40 bg-success/5">
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Swap Completed!</h3>
          <p className="text-sm text-gray-600 mt-1">Transaction recorded successfully</p>
        </div>
        <div className="inline-block bg-white border rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">Swap Code</p>
          <p className="font-mono font-bold text-primary">{result.swapCode}</p>
        </div>
        <Button onClick={onReset} className="mt-2">Process Another Swap</Button>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SwapProcess() {
  const { user } = useAuth()
  const [station, setStation] = useState<StationDetail | null>(null)
  const [queue, setQueue] = useState<QueueStatus | null>(null)
  const [availableBatteries, setAvailableBatteries] = useState<BatteryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [riderPhone, setRiderPhone] = useState('')
  const [rider, setRider] = useState<RiderLookup | null>(null)
  const [riderError, setRiderError] = useState('')
  const [lookingUpRider, setLookingUpRider] = useState(false)
  const [depletedBattery, setDepletedBattery] = useState('')
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
      await Promise.all([loadQueue(s._id), loadAvailableBatteries(s._id)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadQueue, loadAvailableBatteries])

  useEffect(() => { initialLoad() }, [initialLoad])

  // 30-second queue polling
  useEffect(() => {
    if (!station) return
    pollRef.current = setInterval(() => {
      loadQueue(station._id)
      loadAvailableBatteries(station._id)
    }, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [station, loadQueue, loadAvailableBatteries])

  const lookupRider = async () => {
    if (!riderPhone.trim()) { setRiderError('Enter a phone number'); return }
    setLookingUpRider(true)
    setRiderError('')
    setRider(null)
    try {
      const found = await api.get<RiderLookup>(`/operators/rider-lookup?phone=${encodeURIComponent(riderPhone.trim())}`)
      setRider(found)
    } catch (err: any) {
      setRiderError(err.message || 'Rider not found')
    } finally {
      setLookingUpRider(false)
    }
  }

  const handleProcessQueueRider = (riderId: string) => {
    // Pre-fill riderId; operator still needs to do the lookup for full name display
    // since queue returns raw IDs. Instead, prompt operator to enter phone.
    setRiderPhone('')
    setRider({ _id: riderId, fullName: `Rider ID: ...${riderId.slice(-6)}`, phone: '' })
    setDepletedBattery('')
    setChargedBattery('')
    setFormError('')
  }

  const handleSubmit = async () => {
    if (!rider) { setFormError('Look up a rider first'); return }
    if (!depletedBattery.trim()) { setFormError('Enter the depleted battery serial number or ID'); return }
    if (!chargedBattery) { setFormError('Select the charged battery to give out'); return }
    if (!station) return

    setSubmitting(true)
    setFormError('')
    try {
      // Find battery by serial or ID
      const depBatteries = await api.get<any>(`/batteries?stationId=${station._id}&search=${encodeURIComponent(depletedBattery.trim())}&limit=1`)
      const depBatteryList = depBatteries?.batteries ?? depBatteries ?? []
      const depBatteryId = depBatteryList[0]?._id ?? depletedBattery.trim()

      const result = await api.post<SwapResult>('/swaps/complete', {
        riderId: rider._id,
        stationId: station._id,
        depletedBatteryId: depBatteryId,
        chargedBatteryId: chargedBattery,
      })
      setSwapResult(result)
      await Promise.all([loadQueue(station._id), loadAvailableBatteries(station._id)])
      const s = await loadStation()
      if (s) setStation(s)
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete swap. Please verify battery IDs.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setRiderPhone('')
    setRider(null)
    setRiderError('')
    setDepletedBattery('')
    setChargedBattery('')
    setFormError('')
    setSwapResult(null)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Process Swap</h1>
            <p className="text-gray-600 mt-1">Complete battery swap transactions for riders</p>
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
            <Button variant="ghost" size="sm" onClick={initialLoad} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left: swap form or success */}
          {swapResult ? (
            <SuccessPanel result={swapResult} onReset={resetForm} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>New Swap Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Step 1: Rider lookup */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Step 1 — Identify Rider</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rider phone number (e.g. +250...)"
                      value={riderPhone}
                      onChange={(e) => { setRiderPhone(e.target.value); setRider(null); setRiderError('') }}
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
                  <Label className="text-sm font-medium">Step 2 — Depleted Battery (Serial / ID)</Label>
                  <Input
                    placeholder="Enter serial number or scan QR"
                    value={depletedBattery}
                    onChange={(e) => setDepletedBattery(e.target.value)}
                  />
                </div>

                {/* Step 3: Charged battery */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Step 3 — Assign Charged Battery</Label>
                  {availableBatteries.length === 0 ? (
                    <p className="text-sm text-warning flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      No charged batteries available at this station
                    </p>
                  ) : (
                    <Select
                      value={chargedBattery}
                      onChange={(e) => setChargedBattery(e.target.value)}
                    >
                      <option value="">Select a charged battery…</option>
                      {availableBatteries.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.serialNumber} — {b.chargeLevel}% charged
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
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />Complete Swap</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Right: live queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Live Queue</CardTitle>
              <div className="flex items-center gap-2">
                {queue && (
                  <span className="text-xs text-gray-500">
                    {queue.length} waiting · ~{queue.estimatedWait} min
                  </span>
                )}
                <button
                  onClick={() => station && loadQueue(station._id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                  aria-label="Refresh queue"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!queue || queue.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">No riders in queue</p>
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
                          <p className="text-sm font-medium text-gray-700">Rider #{idx + 1}</p>
                          <p className="text-xs text-gray-400 font-mono">...{riderId.slice(-8)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessQueueRider(riderId)}
                        className="text-xs"
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available batteries summary */}
              {station && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Battery className="w-4 h-4 text-success" />
                    <span>{station.availableBatteries} available</span>
                  </div>
                  <Badge variant={station.availableBatteries > station.lowInventoryThreshold ? 'success' : 'warning'}>
                    {station.availableBatteries > station.lowInventoryThreshold ? 'Good Stock' : 'Low Stock'}
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
