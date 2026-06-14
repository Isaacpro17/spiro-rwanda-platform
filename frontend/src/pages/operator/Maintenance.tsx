import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import {
  Wrench, AlertCircle, RefreshCw, Loader2, Plus, X,
  ChevronLeft, ChevronRight, AlertTriangle, User, Clock,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail, StationMaintenanceRequest } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

type Urgency = 'low' | 'medium' | 'high' | 'critical'
type MStatus = 'open' | 'assigned' | 'in_progress' | 'resolved'

function urgencyVariant(urgency: Urgency) {
  if (urgency === 'critical') return 'destructive'
  if (urgency === 'high') return 'destructive'
  if (urgency === 'medium') return 'warning'
  return 'default'
}

function urgencyIcon(urgency: Urgency) {
  if (urgency === 'critical' || urgency === 'high') return <AlertTriangle className="w-3.5 h-3.5" />
  return <Wrench className="w-3.5 h-3.5" />
}

function statusVariant(status: MStatus) {
  if (status === 'resolved') return 'success'
  if (status === 'in_progress') return 'warning'
  if (status === 'assigned') return 'default'
  return 'destructive'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── New Request Modal ─────────────────────────────────────────────────────────

interface NewRequestModalProps {
  onClose: () => void
  onSubmit: (data: { equipment: string; faultDescription: string; urgency: Urgency }) => Promise<void>
}

function NewRequestModal({ onClose, onSubmit }: NewRequestModalProps) {
  const { t } = useLanguage()
  const m = t.operator.maintenance.modal
  const [equipment, setEquipment] = useState('')
  const [faultDescription, setFaultDescription] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    if (!equipment.trim()) { setErr(m.errEquipment); return }
    if (!faultDescription.trim()) { setErr(m.errFault); return }
    setSaving(true)
    setErr('')
    try {
      await onSubmit({ equipment: equipment.trim(), faultDescription: faultDescription.trim(), urgency })
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Failed to create maintenance request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{m.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="equipment" className="text-xs">{m.equipment}</Label>
            <Input
              id="equipment"
              placeholder={m.equipmentPlaceholder}
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fault-desc" className="text-xs">{m.faultDesc}</Label>
            <textarea
              id="fault-desc"
              rows={3}
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              placeholder={m.faultPlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="urgency" className="text-xs">{m.urgency}</Label>
            <Select
              id="urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
            >
              <option value="low">{m.urgencyLow}</option>
              <option value="medium">{m.urgencyMedium}</option>
              <option value="high">{m.urgencyHigh}</option>
              <option value="critical">{m.urgencyCritical}</option>
            </Select>
          </div>

          {err && <p className="text-xs text-error">{err}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{m.cancel}</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {m.submit}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: StationMaintenanceRequest }) {
  const { t } = useLanguage()
  const mn = t.operator.maintenance
  const getStatusLabel = (status: MStatus) => {
    if (status === 'open') return mn.statusOpen
    if (status === 'assigned') return mn.statusAssigned
    if (status === 'in_progress') return mn.statusInProgress
    if (status === 'resolved') return mn.statusResolved
    return status
  }
  return (
    <div className="p-4 border rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            req.urgency === 'critical' || req.urgency === 'high' ? 'bg-error/10' :
            req.urgency === 'medium' ? 'bg-warning/10' : 'bg-gray-100'
          }`}>
            {urgencyIcon(req.urgency)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{req.equipment}</p>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{req.faultDescription}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge variant={urgencyVariant(req.urgency)} className="text-xs capitalize">
            {urgencyIcon(req.urgency)}
            <span className="ml-1">{req.urgency}</span>
          </Badge>
          <Badge variant={statusVariant(req.status)} className="text-xs">
            {getStatusLabel(req.status)}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {fmtDate(req.createdAt)}
        </div>
        {req.assignedTechnician && (
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {req.assignedTechnician.fullName}
            {req.assignedTechnician.phone && (
              <span className="text-gray-400 ml-0.5">· {req.assignedTechnician.phone}</span>
            )}
          </div>
        )}
        {req.resolvedAt && (
          <div className="text-success">
            {mn.resolvedOn} {fmtDate(req.resolvedAt)}
          </div>
        )}
      </div>

      {req.notes && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium">{mn.notes}:</span> {req.notes}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export function Maintenance() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const m = t.operator.maintenance
  const [station, setStation] = useState<StationDetail | null>(null)
  const [requests, setRequests] = useState<StationMaintenanceRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const loadStation = useCallback(async () => {
    const stations = await api.get<StationDetail[]>('/stations')
    return (stations ?? []).find(
      (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
    ) ?? null
  }, [user?._id])

  const loadRequests = useCallback(async (stationId: string, p: number, status: string) => {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
    if (status) params.set('status', status)
    const result = await api.get<any>(`/stations/${stationId}/maintenance?${params}`)
    setRequests(result?.requests ?? [])
    setTotal(result?.total ?? 0)
  }, [])

  const initialLoad = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loadStation()
      if (!s) throw new Error('No station assigned to your account')
      setStation(s)
      await loadRequests(s._id, 1, '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance requests')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadRequests])

  useEffect(() => { initialLoad() }, [initialLoad])

  useEffect(() => {
    if (!station) return
    setIsLoading(true)
    loadRequests(station._id, page, statusFilter).finally(() => setIsLoading(false))
  }, [station, page, statusFilter, loadRequests])

  const handleCreate = async (data: { equipment: string; faultDescription: string; urgency: Urgency }) => {
    if (!station) return
    await api.post(`/stations/${station._id}/maintenance`, data)
    await loadRequests(station._id, 1, statusFilter)
    setPage(1)
  }

  const openCount = requests.filter((r) => r.status === 'open').length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{m.title}</h1>
            <p className="text-gray-600 mt-1">
              {station ? `${station.name} — ${m.subtitleStation}` : m.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={initialLoad}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {m.newRequest}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={initialLoad} className="ml-auto text-error">{m.retry}</Button>
          </div>
        )}

        {/* Summary stats */}
        {!isLoading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: m.statTotal, value: total, color: 'text-gray-900' },
              { label: m.statOpen, value: requests.filter((req) => req.status === 'open').length, color: 'text-error' },
              { label: m.statInProgress, value: requests.filter((req) => req.status === 'assigned' || req.status === 'in_progress').length, color: 'text-warning' },
              { label: m.statResolved, value: requests.filter((req) => req.status === 'resolved').length, color: 'text-success' },
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

        {/* Open requests alert */}
        {!isLoading && openCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {openCount} {openCount !== 1 ? m.openAlerts : m.openAlert} {m.openAlertSuffix}
            </span>
          </div>
        )}

        {/* Filter + list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>
              {m.cardTitle}
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>}
            </CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-36 text-sm"
            >
              <option value="">{m.allStatuses}</option>
              <option value="open">{m.statusOpen}</option>
              <option value="assigned">{m.statusAssigned}</option>
              <option value="in_progress">{m.statusInProgress}</option>
              <option value="resolved">{m.statusResolved}</option>
            </Select>
          </CardHeader>
          <CardContent>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{m.emptyTitle}</p>
                <p className="text-xs text-gray-500">
                  {statusFilter ? m.emptyFilter : m.emptyAll}
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> {m.reportIssue}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <RequestCard key={req._id} req={req} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-gray-500">{m.page} {page} {m.of} {totalPages}</span>
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
          </CardContent>
        </Card>

      </div>

      {showModal && (
        <NewRequestModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />
      )}
    </DashboardLayout>
  )
}
