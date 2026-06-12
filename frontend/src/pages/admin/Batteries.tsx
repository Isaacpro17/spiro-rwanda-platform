import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import {
  Battery, Plus, Search, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, X, CheckCircle2, Zap, Wrench,
  AlertTriangle, Activity,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { BatteryData, BatteryDiagnostics } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatteryStats {
  total: number
  byStatus: {
    available?: number
    charging?: number
    in_use?: number
    faulty?: number
    repair?: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(s: string) {
  if (s === 'available') return 'success' as const
  if (s === 'charging') return 'warning' as const
  if (s === 'in_use') return 'default' as const
  if (s === 'faulty' || s === 'repair') return 'destructive' as const
  return 'secondary' as const
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Create Battery Modal ──────────────────────────────────────────────────────

function CreateBatteryModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [serialNumber, setSerialNumber] = useState('')
  const [chargeLevel, setChargeLevel] = useState('100')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!serialNumber.trim()) { setError('Serial number is required'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/batteries', { serialNumber, chargeLevel: Number(chargeLevel) })
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to create battery')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Battery</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Serial Number *</Label>
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="BAT-2024-XXXX" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Initial Charge Level (%)</Label>
            <Input type="number" min="0" max="100" value={chargeLevel} onChange={(e) => setChargeLevel(e.target.value)} />
          </div>
          {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Add Battery
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Health Modal ──────────────────────────────────────────────────────────────

function HealthModal({ batteryId, serialNumber, onClose }: { batteryId: string; serialNumber: string; onClose: () => void }) {
  const [health, setHealth] = useState<BatteryDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<BatteryDiagnostics>(`/batteries/${batteryId}/health`)
      .then((d) => setHealth(d as any))
      .catch((e) => setError(e.message ?? 'Failed to load health data'))
      .finally(() => setLoading(false))
  }, [batteryId])

  const hPct = health?.healthPercentage ?? 0
  const barColor = hPct >= 70 ? 'bg-success' : hPct >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Battery Health</h2>
            <p className="text-xs text-gray-500 font-mono">{serialNumber}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-error text-center py-6">{error}</p>
        ) : health ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Overall Health</span>
                <span className="font-bold text-gray-900">{hPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${hPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Charge Level', value: `${health.chargeLevel ?? '—'}%` },
                { label: 'Cycle Count', value: health.cycleCount ?? '—' },
                { label: 'Age (days)', value: health.ageInDays ?? '—' },
                { label: 'Remaining Cycles', value: health.expectedRemainingCycles ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {health.recommendations?.length > 0 && (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl">
                <p className="text-xs font-medium text-warning mb-1.5">Recommendations</p>
                <ul className="space-y-1">
                  {health.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-warning shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export function Batteries() {
  const [batteries, setBatteries] = useState<BatteryData[]>([])
  const [stats, setStats] = useState<BatteryStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [healthTarget, setHealthTarget] = useState<{ id: string; serial: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulking, setBulking] = useState(false)

  const loadData = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const [battRes, statsRes] = await Promise.all([
        api.get<{ batteries: BatteryData[]; pagination: { total: number } }>(`/batteries?${params}`),
        api.get<BatteryStats>('/batteries/stats'),
      ])
      setBatteries((battRes as any)?.batteries ?? battRes ?? [])
      setTotal((battRes as any)?.pagination?.total ?? 0)
      setStats(statsRes as any ?? null)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load batteries')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { setPage(1); loadData(1) }, [search, statusFilter]) // eslint-disable-line
  useEffect(() => { loadData(page) }, [page]) // eslint-disable-line

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return
    setBulking(true)
    try {
      await api.put('/batteries/bulk/status', { ids: Array.from(selected), status: bulkStatus })
      setSelected(new Set())
      setBulkStatus('')
      loadData(page)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Bulk update failed')
    } finally {
      setBulking(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === batteries.length ? new Set() : new Set(batteries.map((b) => b._id))
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Battery Fleet</h1>
            <p className="text-gray-600 mt-1">Manage and monitor the battery inventory</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadData(page)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" />Add Battery
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(page)} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.total, icon: <Battery className="w-5 h-5" />, color: 'text-gray-900' },
              { label: 'Available', value: stats.byStatus.available ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-success' },
              { label: 'Charging', value: stats.byStatus.charging ?? 0, icon: <Zap className="w-5 h-5" />, color: 'text-warning' },
              { label: 'In Use', value: stats.byStatus.in_use ?? 0, icon: <Activity className="w-5 h-5" />, color: 'text-primary' },
              { label: 'Faulty / Repair', value: (stats.byStatus.faulty ?? 0) + (stats.byStatus.repair ?? 0), icon: <AlertTriangle className="w-5 h-5" />, color: 'text-error' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">{s.icon}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters + bulk actions */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search by serial number…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="charging">Charging</option>
                <option value="in_use">In Use</option>
                <option value="faulty">Faulty</option>
                <option value="repair">Repair</option>
              </select>

              {selected.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-gray-500">{selected.size} selected</span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Set status…</option>
                    <option value="available">Available</option>
                    <option value="repair">Repair</option>
                    <option value="faulty">Faulty</option>
                  </select>
                  <Button size="sm" onClick={handleBulkStatus} disabled={!bulkStatus || bulking}>
                    {bulking ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              Batteries
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : batteries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Battery className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No batteries found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={selected.size === batteries.length && batteries.length > 0}
                            onChange={toggleAll}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Charge</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Last Swap</TableHead>
                        <TableHead>Repairs</TableHead>
                        <TableHead className="text-right">Health</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batteries.map((bat) => (
                        <TableRow key={bat._id} className={`hover:bg-gray-50 transition-colors ${selected.has(bat._id) ? 'bg-primary/5' : ''}`}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selected.has(bat._id)}
                              onChange={() => toggleSelect(bat._id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono font-medium text-gray-900">{bat.serialNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(bat.status)} className="text-xs">
                              {statusLabel(bat.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${bat.chargeLevel > 50 ? 'bg-success' : bat.chargeLevel > 20 ? 'bg-warning' : 'bg-error'}`}
                                  style={{ width: `${bat.chargeLevel}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{bat.chargeLevel}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {bat.stationId ? (
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {typeof bat.stationId === 'string' ? bat.stationId.slice(-6) : '—'}
                              </span>
                            ) : <span className="text-gray-300 italic text-xs">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {bat.lastSwapAt ? fmtDate(bat.lastSwapAt) : '—'}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${bat.repairCount > 2 ? 'text-error' : 'text-gray-700'}`}>
                              {bat.repairCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => setHealthTarget({ id: bat._id, serial: bat.serialNumber })}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

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

      {showCreate && <CreateBatteryModal onClose={() => setShowCreate(false)} onSave={() => loadData(page)} />}
      {healthTarget && (
        <HealthModal
          batteryId={healthTarget.id}
          serialNumber={healthTarget.serial}
          onClose={() => setHealthTarget(null)}
        />
      )}
    </DashboardLayout>
  )
}
