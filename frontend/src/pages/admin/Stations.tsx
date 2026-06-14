import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import {
  MapPin, Plus, Edit2, Search, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, X, Activity, Battery, Power, Users,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(s: string) {
  if (s === 'active') return 'success' as const
  if (s === 'maintenance') return 'warning' as const
  return 'destructive' as const
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffUser {
  _id: string
  fullName: string
  phone: string
  email: string
}

// ── Station Modal ─────────────────────────────────────────────────────────────

interface StationModalProps {
  station: StationDetail | null
  onClose: () => void
  onSave: () => void
}

function StationModal({ station, onClose, onSave }: StationModalProps) {
  const { t } = useLanguage()
  const sm = t.admin.stations.stationModal
  const isEdit = !!station
  const [name, setName] = useState(station?.name ?? '')
  const [address, setAddress] = useState(station?.address ?? '')
  const [province, setProvince] = useState(station?.province ?? '')
  const [totalSlots, setTotalSlots] = useState(String(station?.totalSlots ?? 10))
  const [openTime, setOpenTime] = useState(station?.operatingHours?.open ?? '06:00')
  const [closeTime, setCloseTime] = useState(station?.operatingHours?.close ?? '22:00')
  const [lowThreshold, setLowThreshold] = useState(String(station?.lowInventoryThreshold ?? 2))
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      setError(sm.errRequired)
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name,
        address,
        province,
        totalSlots: Number(totalSlots),
        lowInventoryThreshold: Number(lowThreshold),
        operatingHours: { open: openTime, close: closeTime },
      }
      if (!isEdit && lat && lng) {
        body.location = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }
      }
      if (isEdit) {
        await api.put(`/stations/${station!._id}`, body)
      } else {
        await api.post('/stations', body)
      }
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save station')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? sm.titleEdit : sm.titleCreate}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{sm.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kigali City Center" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{sm.address}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="KN 5 Ave, Nyarugenge" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{sm.province}</Label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">{sm.selectProvince}</option>
              {['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{sm.lat}</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.9441" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{sm.lng}</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="30.0619" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{sm.totalSlots}</Label>
              <Input type="number" min="1" value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{sm.lowAlert}</Label>
              <Input type="number" min="1" value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{sm.openTime}</Label>
              <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{sm.closeTime}</Label>
              <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-error flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{sm.cancel}</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? sm.saveChanges : sm.createStation}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Assign Staff Modal ────────────────────────────────────────────────────────

interface AssignStaffModalProps {
  station: StationDetail
  onClose: () => void
  onSave: () => void
}

function AssignStaffModal({ station, onClose, onSave }: AssignStaffModalProps) {
  const { t } = useLanguage()
  const am = t.admin.stations.assignModal
  const [operators, setOperators] = useState<StaffUser[]>([])
  const [technicians, setTechnicians] = useState<StaffUser[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  const currentOperatorId = station.operatorId?._id ?? ''
  const currentTechIds: string[] = station.assignedTechnicians?.map((tech) => tech._id) ?? []

  const [selectedOperator, setSelectedOperator] = useState<string>(currentOperatorId)
  const [selectedTechs, setSelectedTechs] = useState<string[]>(currentTechIds)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoadingStaff(true)
      try {
        const [opRes, techRes] = await Promise.all([
          api.get<any>('/users?role=operator&limit=100'),
          api.get<any>('/users?role=technician&limit=100'),
        ])
        setOperators((opRes as any)?.users ?? opRes ?? [])
        setTechnicians((techRes as any)?.users ?? techRes ?? [])
      } catch {
        setError('Failed to load staff list')
      } finally {
        setLoadingStaff(false)
      }
    }
    load()
  }, [])

  const toggleTech = (id: string) => {
    setSelectedTechs((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.put(`/stations/${station._id}`, {
        operatorId: selectedOperator || null,
        assignedTechnicians: selectedTechs,
      })
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to assign staff')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">{am.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{station.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingStaff ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">

            {/* Operator */}
            <div>
              <Label className="text-xs font-medium text-gray-700 block mb-2">
                {am.operatorLabel}
                <span className="text-gray-400 font-normal ml-1">{am.operatorHint}</span>
              </Label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{am.noOperator}</option>
                {operators.map((op) => (
                  <option key={op._id} value={op._id}>
                    {op.fullName} · {op.phone}
                  </option>
                ))}
              </select>
              {operators.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">{am.noOperatorsFound}</p>
              )}
            </div>

            {/* Technicians */}
            <div>
              <Label className="text-xs font-medium text-gray-700 block mb-2">
                {am.techsLabel}
                <span className="text-gray-400 font-normal ml-1">{am.techsHint}</span>
              </Label>
              {technicians.length === 0 ? (
                <p className="text-xs text-gray-400">{am.noTechsFound}</p>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto">
                  {technicians.map((tech) => {
                    const checked = selectedTechs.includes(tech._id)
                    return (
                      <label
                        key={tech._id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          checked ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTech(tech._id)}
                          className="w-4 h-4 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{tech.fullName}</p>
                          <p className="text-xs text-gray-500">{tech.phone}</p>
                        </div>
                        {checked && (
                          <Badge variant="default" className="text-xs shrink-0">{am.assigned}</Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
              {selectedTechs.length > 0 && (
                <p className="text-xs text-primary mt-1.5">
                  {selectedTechs.length === 1
                    ? am.techsSelected.replace('{n}', String(selectedTechs.length))
                    : am.techsSelectedPlural.replace('{n}', String(selectedTechs.length))}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />{error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{am.cancel}</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {am.saveAssignment}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function Stations() {
  const { t } = useLanguage()
  const s = t.admin.stations
  const [stations, setStations] = useState<StationDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalStation, setModalStation] = useState<StationDetail | null | 'new'>()
  const [assignStation, setAssignStation] = useState<StationDetail | null>(null)
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null)

  const loadData = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await api.get<{ stations: StationDetail[]; pagination: { total: number } }>(`/stations?${params}`)
      const data = res as any
      setStations(data?.stations ?? data ?? [])
      setTotal(data?.pagination?.total ?? (Array.isArray(data) ? data.length : 0))
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load stations')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { setPage(1); loadData(1) }, [search, statusFilter]) // eslint-disable-line
  useEffect(() => { loadData(page) }, [page]) // eslint-disable-line

  const handleStatusCycle = async (station: StationDetail) => {
    const next = station.status === 'active' ? 'maintenance' : station.status === 'maintenance' ? 'inactive' : 'active'
    setStatusChangingId(station._id)
    try {
      await api.put(`/stations/${station._id}/status`, { status: next })
      setStations((prev) => prev.map((st) => st._id === station._id ? { ...st, status: next } : st))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to update status')
    } finally {
      setStatusChangingId(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const totals = stations.reduce(
    (acc, st) => ({
      active: acc.active + (st.status === 'active' ? 1 : 0),
      maintenance: acc.maintenance + (st.status === 'maintenance' ? 1 : 0),
      available: acc.available + (st.availableBatteries || 0),
    }),
    { active: 0, maintenance: 0, available: 0 }
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{s.title}</h1>
            <p className="text-gray-600 mt-1">{s.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadData(page)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setModalStation('new')}>
              <Plus className="w-4 h-4 mr-1" />{s.addStation}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(page)} className="ml-auto text-error">{s.retry}</Button>
          </div>
        )}

        {/* Quick stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: s.statTotal, value: total, icon: <MapPin className="w-5 h-5" />, color: 'text-primary' },
              { label: s.statActive, value: totals.active, icon: <Activity className="w-5 h-5" />, color: 'text-success' },
              { label: s.statMaintenance, value: totals.maintenance, icon: <AlertCircle className="w-5 h-5" />, color: 'text-warning' },
              { label: s.statAvailable, value: totals.available, icon: <Battery className="w-5 h-5" />, color: 'text-gray-700' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">{stat.icon}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder={s.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{s.allStatus}</option>
                <option value="active">{s.statusActive}</option>
                <option value="maintenance">{s.statusMaintenance}</option>
                <option value="inactive">{s.statusInactive}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {s.cardTitle}
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : stations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{s.emptyTitle}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{s.colStation}</TableHead>
                        <TableHead>{s.colCode}</TableHead>
                        <TableHead>{s.colStatus}</TableHead>
                        <TableHead>{s.colBatteries}</TableHead>
                        <TableHead>{s.colOperator}</TableHead>
                        <TableHead>{s.colTechnicians}</TableHead>
                        <TableHead>{s.colCreated}</TableHead>
                        <TableHead className="text-right">{s.colActions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stations.map((station) => {
                        const techList = station.assignedTechnicians ?? []
                        return (
                          <TableRow key={station._id} className="hover:bg-gray-50 transition-colors">
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{station.name}</p>
                                {station.address && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />{station.address}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {station.stationCode ?? '—'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(station.status)} className="text-xs capitalize">
                                {station.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-700">
                                <span className="text-success font-medium">{station.availableBatteries}</span>
                                <span className="text-gray-400"> / {station.totalSlots}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {(station.operatorId as any)?.fullName ?? (
                                <span className="text-gray-300 italic">{s.unassigned}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {techList.length === 0 ? (
                                <span className="text-xs text-gray-300 italic">{s.noTechs}</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  {techList.slice(0, 2).map((tech) => (
                                    <span key={tech._id} className="text-xs text-gray-600">
                                      {tech.fullName}
                                    </span>
                                  ))}
                                  {techList.length > 2 && (
                                    <span className="text-xs text-gray-400">
                                      {s.moreTechs.replace('{n}', String(techList.length - 2))}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{fmtDate(station.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setAssignStation(station)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                  title="Assign Staff"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setModalStation(station)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleStatusCycle(station)}
                                  disabled={statusChangingId === station._id}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-warning hover:bg-warning/5 transition-colors"
                                  title="Cycle Status"
                                >
                                  {statusChangingId === station._id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Power className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">{s.page} {page} {s.of} {totalPages} · {total} {s.totalStations}</span>
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

      {/* Edit / Create Station Modal */}
      {(modalStation === 'new' || (modalStation && typeof modalStation === 'object')) && (
        <StationModal
          station={modalStation === 'new' ? null : modalStation as StationDetail}
          onClose={() => setModalStation(undefined)}
          onSave={() => loadData(page)}
        />
      )}

      {/* Assign Staff Modal */}
      {assignStation && (
        <AssignStaffModal
          station={assignStation}
          onClose={() => setAssignStation(null)}
          onSave={() => loadData(page)}
        />
      )}
    </DashboardLayout>
  )
}
