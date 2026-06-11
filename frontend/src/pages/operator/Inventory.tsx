import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import {
  Battery, AlertCircle, RefreshCw, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, Wrench, X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { StationDetail, BatteryData } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(status: string) {
  if (status === 'available') return 'success'
  if (status === 'charging') return 'warning'
  if (status === 'in_use') return 'default'
  return 'destructive'
}

function statusLabel(status: string) {
  if (status === 'available') return 'Available'
  if (status === 'charging') return 'Charging'
  if (status === 'in_use') return 'In Use'
  if (status === 'faulty') return 'Faulty'
  if (status === 'repair') return 'Repair'
  return status
}

// ── Repair Modal ──────────────────────────────────────────────────────────────

interface RepairModalProps {
  battery: BatteryData
  onClose: () => void
  onSubmit: (batteryId: string, description: string) => Promise<void>
}

function RepairModal({ battery, onClose, onSubmit }: RepairModalProps) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    if (!description.trim()) { setErr('Please describe the issue'); return }
    setSaving(true)
    setErr('')
    try {
      await onSubmit(battery._id, description)
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Failed to submit repair request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Request Repair</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Battery: <span className="font-mono font-medium">{battery.serialNumber}</span>
        </p>
        <div className="space-y-1.5 mb-4">
          <Label htmlFor="repair-desc" className="text-xs">Issue Description</Label>
          <textarea
            id="repair-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the fault or issue..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
        {err && <p className="text-xs text-error mb-3">{err}</p>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Inventory Update Card ─────────────────────────────────────────────────────

interface InventoryUpdateCardProps {
  station: StationDetail
  onUpdate: (available: number, charging: number) => Promise<void>
}

function InventoryUpdateCard({ station, onUpdate }: InventoryUpdateCardProps) {
  const [available, setAvailable] = useState(String(station.availableBatteries))
  const [charging, setCharging] = useState(String(station.chargingBatteries))
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      await onUpdate(parseInt(available) || 0, parseInt(charging) || 0)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Update Inventory Counts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Available Batteries</Label>
            <Input
              type="number"
              min={0}
              value={available}
              onChange={(e) => setAvailable(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Charging Batteries</Label>
            <Input
              type="number"
              min={0}
              value={charging}
              onChange={(e) => setCharging(e.target.value)}
              className="w-28"
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {success ? 'Saved!' : 'Update'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export function Inventory() {
  const { user } = useAuth()
  const [station, setStation] = useState<StationDetail | null>(null)
  const [batteries, setBatteries] = useState<BatteryData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [repairTarget, setRepairTarget] = useState<BatteryData | null>(null)

  const loadStation = useCallback(async () => {
    const stations = await api.get<StationDetail[]>('/stations')
    return (stations ?? []).find(
      (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
    ) ?? null
  }, [user?._id])

  const loadBatteries = useCallback(async (stationId: string, p: number, status: string) => {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), stationId })
    if (status) params.set('status', status)
    const result = await api.get<any>(`/batteries?${params}`)
    setBatteries(result?.batteries ?? result ?? [])
    setTotal(result?.pagination?.total ?? (result?.batteries ?? result ?? []).length)
  }, [])

  const initialLoad = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loadStation()
      if (!s) throw new Error('No station assigned to your account')
      setStation(s)
      await loadBatteries(s._id, 1, '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadBatteries])

  useEffect(() => { initialLoad() }, [initialLoad])

  useEffect(() => {
    if (!station) return
    setIsLoading(true)
    loadBatteries(station._id, page, statusFilter).finally(() => setIsLoading(false))
  }, [station, page, statusFilter, loadBatteries])

  const handleMarkFaulty = async (battery: BatteryData) => {
    if (!station) return
    setActionLoading(battery._id)
    try {
      await api.put(`/batteries/${battery._id}`, { status: 'faulty', isFaulty: true })
      setBatteries((prev) => prev.map((b) => b._id === battery._id ? { ...b, status: 'faulty', isFaulty: true } : b))
      // Refresh station inventory counts
      const s = await loadStation()
      if (s) setStation(s)
    } catch (err: any) {
      alert(err.message || 'Failed to mark battery as faulty')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRepairSubmit = async (batteryId: string, description: string) => {
    await api.post(`/batteries/${batteryId}/repair`, { description })
    setBatteries((prev) => prev.map((b) => b._id === batteryId ? { ...b, status: 'repair' } : b))
  }

  const handleInventoryUpdate = async (available: number, charging: number) => {
    if (!station) return
    await api.put(`/stations/${station._id}/inventory`, { availableBatteries: available, chargingBatteries: charging })
    setStation((prev) => prev ? { ...prev, availableBatteries: available, chargingBatteries: charging } : prev)
  }

  // Summary counts
  const counts = {
    total: batteries.length,
    available: batteries.filter((b) => b.status === 'available').length,
    charging: batteries.filter((b) => b.status === 'charging').length,
    faulty: batteries.filter((b) => b.status === 'faulty' || b.status === 'repair').length,
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Battery Inventory</h1>
            <p className="text-gray-600 mt-1">
              {station ? `${station.name} — manage battery stock` : 'Manage station battery stock'}
            </p>
          </div>
          <button
            onClick={initialLoad}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={initialLoad} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {/* Summary strip */}
        {!isLoading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Batteries', value: total, color: 'text-gray-900' },
              { label: 'Available', value: station?.availableBatteries ?? counts.available, color: 'text-success' },
              { label: 'Charging', value: station?.chargingBatteries ?? counts.charging, color: 'text-warning' },
              { label: 'Faulty/Repair', value: counts.faulty, color: 'text-error' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Inventory update card */}
        {station && !error && (
          <InventoryUpdateCard station={station} onUpdate={handleInventoryUpdate} />
        )}

        {/* Filter + table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Battery List</CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-40 text-sm"
            >
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="charging">Charging</option>
              <option value="in_use">In Use</option>
              <option value="faulty">Faulty</option>
              <option value="repair">Repair</option>
            </Select>
          </CardHeader>
          <CardContent className="p-0">

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : batteries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Battery className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No batteries found</p>
                <p className="text-xs text-gray-500">
                  {statusFilter ? 'Try a different filter' : 'No batteries are assigned to this station'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto px-6 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Charge</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Repairs</TableHead>
                        <TableHead>Last Swap</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batteries.map((battery) => (
                        <TableRow key={battery._id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-mono text-sm font-medium">{battery.serialNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${battery.chargeLevel >= 60 ? 'bg-success' : battery.chargeLevel >= 30 ? 'bg-warning' : 'bg-error'}`}
                                  style={{ width: `${battery.chargeLevel}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{battery.chargeLevel}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(battery.status)} className="text-xs">
                              {statusLabel(battery.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{battery.repairCount}</TableCell>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {battery.lastSwapAt
                              ? new Date(battery.lastSwapAt).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {battery.status !== 'faulty' && battery.status !== 'repair' && (
                                <button
                                  onClick={() => handleMarkFaulty(battery)}
                                  disabled={actionLoading === battery._id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-error border border-error/30 rounded-md hover:bg-error/5 transition-colors disabled:opacity-50"
                                  title="Mark as faulty"
                                >
                                  {actionLoading === battery._id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <AlertTriangle className="w-3 h-3" />}
                                  Faulty
                                </button>
                              )}
                              {battery.status !== 'repair' && (
                                <button
                                  onClick={() => setRepairTarget(battery)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-warning border border-warning/30 rounded-md hover:bg-warning/5 transition-colors"
                                  title="Request repair"
                                >
                                  <Wrench className="w-3 h-3" />
                                  Repair
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">Page {page} of {totalPages} · {total} batteries</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Repair modal */}
      {repairTarget && (
        <RepairModal
          battery={repairTarget}
          onClose={() => setRepairTarget(null)}
          onSubmit={handleRepairSubmit}
        />
      )}
    </DashboardLayout>
  )
}
