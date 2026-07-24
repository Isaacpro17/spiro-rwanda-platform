import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import {
  Battery, Search, Wrench, AlertCircle, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, Activity, Zap, X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail, BatteryData, BatteryDiagnostics } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthColor(pct: number) {
  if (pct >= 80) return { text: 'text-success', bg: 'bg-success', track: 'bg-success/10' }
  if (pct >= 50) return { text: 'text-warning', bg: 'bg-warning', track: 'bg-warning/10' }
  return { text: 'text-error', bg: 'bg-error', track: 'bg-error/10' }
}

function chargeColor(pct: number) {
  if (pct >= 60) return 'bg-success'
  if (pct >= 30) return 'bg-warning'
  return 'bg-error'
}

function batteryStatusVariant(status: string) {
  if (status === 'available') return 'success' as const
  if (status === 'charging') return 'default' as const
  if (status === 'faulty' || status === 'repair') return 'destructive' as const
  return 'warning' as const
}

// ── Repair Request Modal ──────────────────────────────────────────────────────

interface RepairModalProps {
  battery: BatteryData
  onClose: () => void
  onSubmit: (issueType: string, description: string, priority: string) => Promise<void>
}

function RepairModal({ battery, onClose, onSubmit }: RepairModalProps) {
  const { t } = useLanguage()
  const rm = t.technician.diagnostics.repairModal
  const [issueType, setIssueType] = useState('low_performance')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    if (!description.trim()) { setErr(rm.errDescription); return }
    setSaving(true)
    setErr('')
    try {
      await onSubmit(issueType, description.trim(), priority)
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{rm.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg mb-4 text-sm">
          <p className="font-medium text-gray-800">{battery.serialNumber}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {rm.statusLine.replace('{status}', battery.status).replace('{n}', String(battery.chargeLevel))}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-type" className="text-xs">{rm.issueType}</Label>
            <Select id="issue-type" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
              <option value="low_performance">{rm.lowPerf}</option>
              <option value="not_charging">{rm.notCharging}</option>
              <option value="physical_damage">{rm.physicalDamage}</option>
              <option value="faulty">{rm.faultyDefective}</option>
              <option value="other">{rm.other}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">{rm.description}</Label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={rm.descPlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority" className="text-xs">{rm.priority}</Label>
            <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">{rm.priorityLow}</option>
              <option value="medium">{rm.priorityMedium}</option>
              <option value="high">{rm.priorityHigh}</option>
              <option value="critical">{rm.priorityCritical}</option>
            </Select>
          </div>

          {err && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{err}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{rm.cancel}</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
              {rm.submit}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Health Panel ──────────────────────────────────────────────────────────────

function HealthPanel({
  battery,
  diagnostics,
  loading,
  onRunDiagnostics,
  onReportIssue,
}: {
  battery: BatteryData
  diagnostics: BatteryDiagnostics | null
  loading: boolean
  onRunDiagnostics: () => void
  onReportIssue: () => void
}) {
  const { t } = useLanguage()
  const diag = t.technician.diagnostics
  const hc = diagnostics ? healthColor(diagnostics.healthPercentage) : null

  const getHealthLabel = (pct: number) => {
    if (pct >= 80) return diag.healthGood
    if (pct >= 50) return diag.healthFair
    return diag.healthPoor
  }

  return (
    <div className="space-y-4">
      {/* Battery summary */}
      <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{battery.serialNumber}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {diag.repairCount} {battery.repairCount} ·{' '}
            {battery.lastSwapAt
              ? `${diag.lastSwap} ${new Date(battery.lastSwapAt).toLocaleDateString()}`
              : diag.neverSwapped}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={batteryStatusVariant(battery.status)} className="text-xs capitalize">
            {battery.status}
          </Badge>
          {battery.isFaulty && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />{diag.faulty}
            </Badge>
          )}
        </div>
      </div>

      {/* Charge level */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{diag.chargeLevel}</span>
          <span className="font-medium">{battery.chargeLevel}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${chargeColor(battery.chargeLevel)}`}
            style={{ width: `${battery.chargeLevel}%` }}
          />
        </div>
      </div>

      {/* Diagnostics result */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : diagnostics ? (
        <div className="space-y-4">
          {/* Health score */}
          <div className={`p-4 rounded-xl ${hc!.track}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{diag.batteryHealth}</span>
              <span className={`text-xl font-bold ${hc!.text}`}>
                {diagnostics.healthPercentage}% <span className="text-sm font-normal">{getHealthLabel(diagnostics.healthPercentage)}</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hc!.bg}`}
                style={{ width: `${diagnostics.healthPercentage}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: diag.cycleCount, value: diagnostics.cycleCount },
              { label: diag.remainingCycles, value: diagnostics.expectedRemainingCycles },
              { label: diag.ageDays, value: diagnostics.ageInDays },
              {
                label: diag.lastCharged,
                value: diagnostics.lastChargedAt
                  ? new Date(diagnostics.lastChargedAt).toLocaleDateString()
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <div className="p-4 border border-warning/30 bg-warning/5 rounded-xl">
              <p className="text-xs font-semibold text-warning mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />{diag.recommendations}
              </p>
              <ul className="space-y-1.5">
                {diagnostics.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-warning mt-0.5">•</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">{diag.runDiagnosticsHint}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onRunDiagnostics} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
          {diag.runDiagnostics}
        </Button>
        <Button variant="outline" onClick={onReportIssue} className="flex-1 text-error border-error/30 hover:bg-error/5">
          <Wrench className="w-4 h-4 mr-1" />
          {diag.reportIssue}
        </Button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Diagnostics() {
  const { t } = useLanguage()
  const diag = t.technician.diagnostics
  const [stations, setStations] = useState<StationDetail[]>([])
  const [selectedStation, setSelectedStation] = useState('')
  const [batteries, setBatteries] = useState<BatteryData[]>([])
  const [selectedBattery, setSelectedBattery] = useState<BatteryData | null>(null)
  const [diagnostics, setDiagnostics] = useState<BatteryDiagnostics | null>(null)

  const [stationsLoading, setStationsLoading] = useState(true)
  const [batteriesLoading, setBatteriesLoading] = useState(false)
  const [diagLoading, setDiagLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  const [serialSearch, setSerialSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  const [showRepairModal, setShowRepairModal] = useState(false)

  const loadStations = useCallback(async () => {
    try {
      const data = await api.get<StationDetail[]>('/technicians/my-stations')
      setStations(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations')
    } finally {
      setStationsLoading(false)
    }
  }, [])

  useEffect(() => { loadStations() }, [loadStations])

  const loadBatteries = useCallback(async (stationId: string) => {
    if (!stationId) return
    setBatteriesLoading(true)
    setSelectedBattery(null)
    setDiagnostics(null)
    try {
      const result = await api.get<any>(`/batteries?stationId=${stationId}&limit=50`)
      setBatteries(result?.batteries ?? result ?? [])
    } catch { /* ignore */ }
    finally { setBatteriesLoading(false) }
  }, [])

  useEffect(() => {
    if (selectedStation) loadBatteries(selectedStation)
    else setBatteries([])
  }, [selectedStation, loadBatteries])

  const runDiagnostics = async () => {
    if (!selectedBattery) return
    setDiagLoading(true)
    setDiagnostics(null)
    try {
      const data = await api.get<BatteryDiagnostics>(`/batteries/${selectedBattery._id}/health`)
      setDiagnostics(data)
    } catch (e: any) {
      setError(e.message || 'Failed to run diagnostics')
    } finally {
      setDiagLoading(false)
    }
  }

  const searchBySerial = async () => {
    if (!serialSearch.trim()) return
    setSearchLoading(true)
    setError(null)
    try {
      const result = await api.get<any>(`/batteries?search=${encodeURIComponent(serialSearch.trim())}&limit=1`)
      const list = result?.batteries ?? result ?? []
      if (list.length === 0) {
        setError('No battery found with that serial number')
        return
      }
      const battery = list[0] as BatteryData
      setSelectedBattery(battery)
      setDiagnostics(null)
      if (battery.stationId) setSelectedStation(battery.stationId)
    } catch (e: any) {
      setError(e.message || 'Battery not found')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleRepairSubmit = async (issueType: string, description: string, priority: string) => {
    if (!selectedBattery) return
    await api.post(`/batteries/${selectedBattery._id}/repair`, { issueType, description, priority })
    const updated = await api.get<BatteryData>(`/batteries/${selectedBattery._id}`)
    if (updated) {
      setSelectedBattery(updated)
      setBatteries((prev) => prev.map((b) => b._id === selectedBattery._id ? updated : b))
    }
    setSuccess(diag.repairSuccess)
    setTimeout(() => setSuccess(''), 5000)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{diag.title}</h1>
            <p className="text-gray-600 mt-1">{diag.subtitle}</p>
          </div>
          <button
            onClick={loadStations}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-error/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/20 rounded-xl text-sm text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}



        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left: station + battery selector */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{diag.browse}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Station selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{diag.selectStation}</Label>
                  {stationsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />{diag.loadingStations}
                    </div>
                  ) : stations.length === 0 ? (
                    <p className="text-sm text-gray-500">{diag.noStationsAssigned}</p>
                  ) : (
                    <Select
                      value={selectedStation}
                      onChange={(e) => setSelectedStation(e.target.value)}
                    >
                      <option value="">{diag.selectStationPlaceholder}</option>
                      {stations.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </Select>
                  )}
                </div>

                {/* Battery list */}
                {selectedStation && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{diag.batteriesAtStation}</Label>
                    {batteriesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : batteries.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">{diag.noBatteries}</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {batteries.map((b) => (
                          <button
                            key={b._id}
                            onClick={() => { setSelectedBattery(b); setDiagnostics(null) }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedBattery?._id === b._id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Battery className={`w-4 h-4 shrink-0 ${
                                  b.status === 'available' ? 'text-success' :
                                  b.status === 'faulty' || b.status === 'repair' ? 'text-error' :
                                  'text-gray-400'
                                }`} />
                                <span className="text-sm font-medium truncate">{b.serialNumber}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-500">{b.chargeLevel}%</span>
                                <Badge variant={batteryStatusVariant(b.status)} className="text-xs capitalize">
                                  {b.status}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: health panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{diag.healthAnalysis}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBattery ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <Battery className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{diag.noBatterySelected}</p>
                  <p className="text-xs text-gray-500">{diag.noBatteryDesc}</p>
                </div>
              ) : (
                <HealthPanel
                  battery={selectedBattery}
                  diagnostics={diagnostics}
                  loading={diagLoading}
                  onRunDiagnostics={runDiagnostics}
                  onReportIssue={() => setShowRepairModal(true)}
                />
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {showRepairModal && selectedBattery && (
        <RepairModal
          battery={selectedBattery}
          onClose={() => setShowRepairModal(false)}
          onSubmit={handleRepairSubmit}
        />
      )}
    </DashboardLayout>
  )
}
