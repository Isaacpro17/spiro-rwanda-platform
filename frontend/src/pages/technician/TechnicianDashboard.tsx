import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, AlertCircle,
  Loader2, RefreshCw, ClipboardList, Activity, User,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail, StationMaintenanceRequest } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyVariant(urgency: string) {
  if (urgency === 'critical' || urgency === 'high') return 'destructive' as const
  if (urgency === 'medium') return 'warning' as const
  return 'default' as const
}

function statusVariant(status: string) {
  if (status === 'resolved') return 'success' as const
  if (status === 'in_progress') return 'warning' as const
  return 'default' as const
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  iconBg: string
  valueColor: string
  sub?: string
}

function KpiCard({ label, value, icon, iconBg, valueColor, sub }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Compact Task Row ──────────────────────────────────────────────────────────

function TaskRow({ task, onStart }: { task: StationMaintenanceRequest; onStart: (id: string) => void }) {
  const { t } = useLanguage()
  const tk = t.technician.tasks
  const stationName = typeof task.stationId === 'object' ? task.stationId.name : 'Unknown Station'
  const isOpen = task.status === 'open' || task.status === 'assigned'
  const getStatusLabel = (s: string) => {
    if (s === 'open') return tk.statusOpen
    if (s === 'assigned') return tk.statusAssigned
    if (s === 'in_progress') return tk.statusInProgress
    if (s === 'resolved') return tk.statusResolved
    return s
  }

  return (
    <div className="p-4 border rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant={urgencyVariant(task.urgency)} className="text-xs capitalize">
              {(task.urgency === 'critical' || task.urgency === 'high') && (
                <AlertTriangle className="w-3 h-3 mr-1" />
              )}
              {task.urgency}
            </Badge>
            <Badge variant={statusVariant(task.status)} className="text-xs">
              {getStatusLabel(task.status)}
            </Badge>
          </div>
          <p className="font-medium text-sm text-gray-900 truncate">{task.equipment}</p>
          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.faultDescription}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{stationName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{fmtDate(task.createdAt)}
            </span>
          </div>
        </div>
        {isOpen && (
          <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => onStart(task._id)}>
            {t.technician.dashboard.start}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TechnicianDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const d = t.technician.dashboard
  const navigate = useNavigate()
  const [stations, setStations] = useState<StationDetail[]>([])
  const [tasks, setTasks] = useState<StationMaintenanceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const [stationsRes, tasksRes] = await Promise.all([
        api.get<StationDetail[]>('/technicians/my-stations'),
        api.get<{ tasks: StationMaintenanceRequest[]; total: number }>('/technicians/my-tasks?limit=100'),
      ])
      setStations(stationsRes ?? [])
      setTasks((tasksRes as any)?.tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStartTask = async (taskId: string) => {
    try {
      await api.put(`/technicians/tasks/${taskId}`, { status: 'in_progress' })
      setTasks((prev) =>
        prev.map((t) => t._id === taskId ? { ...t, status: 'in_progress' as const } : t)
      )
    } catch { /* user can retry in Tasks page */ }
  }

  const openCount = tasks.filter((t) => t.status === 'open' || t.status === 'assigned').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const resolvedCount = tasks.filter((t) => t.status === 'resolved').length
  const criticalCount = tasks.filter(
    (t) => (t.status === 'open' || t.status === 'assigned') && (t.urgency === 'critical' || t.urgency === 'high')
  ).length

  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const activeTasks = tasks
    .filter((t) => t.status !== 'resolved')
    .sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3))
    .slice(0, 5)

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
            <h1 className="text-3xl font-bold text-gray-900">
              {d.greeting} {user?.fullName?.split(' ')[0] ?? d.technicianFallback}
            </h1>
            <p className="text-gray-600 mt-1">
              {stations.length} {stations.length !== 1 ? d.stationsPlural : d.stationsSingle} ·{' '}
              {openCount + inProgressCount} {openCount + inProgressCount !== 1 ? d.tasksPlural : d.tasksSingle}
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-error">{d.retry}</Button>
          </div>
        )}

        {criticalCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {criticalCount} {criticalCount !== 1 ? d.criticalAlerts : d.criticalAlert} {d.criticalSuffix}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/technician/tasks')} className="ml-auto text-error">
              {d.viewTasks}
            </Button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label={d.kpiOpen} value={openCount} icon={<ClipboardList className="w-5 h-5 text-error" />} iconBg="bg-error/10" valueColor="text-error" sub={d.kpiOpenSub} />
          <KpiCard label={d.kpiInProgress} value={inProgressCount} icon={<Activity className="w-5 h-5 text-warning" />} iconBg="bg-warning/10" valueColor="text-warning" sub={d.kpiInProgressSub} />
          <KpiCard label={d.kpiResolved} value={resolvedCount} icon={<CheckCircle2 className="w-5 h-5 text-success" />} iconBg="bg-success/10" valueColor="text-success" sub={d.kpiResolvedSub} />
          <KpiCard label={d.kpiStations} value={stations.length} icon={<MapPin className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" valueColor="text-primary" sub={d.kpiStationsSub} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Active tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>{d.activeTasks}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/technician/tasks')}>{d.viewAll}</Button>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{d.allCaughtUp}</p>
                  <p className="text-xs text-gray-500">{d.noActiveTasks}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <TaskRow key={task._id} task={task} onStart={handleStartTask} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned stations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>{d.myStations}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/technician/diagnostics')}>{d.diagnosticsBtn}</Button>
            </CardHeader>
            <CardContent>
              {stations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{d.noStations}</p>
                  <p className="text-xs text-gray-500">{d.contactAdmin}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stations.map((station) => (
                    <div key={station._id} className="p-4 border rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">{station.name}</p>
                          {station.address && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{station.address}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={station.status === 'active' ? 'success' : station.status === 'maintenance' ? 'warning' : 'destructive'}
                          className="text-xs capitalize shrink-0"
                        >
                          {station.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span>{station.totalSlots} {d.slots}</span>
                        <span className="text-success">{station.availableBatteries} {d.available}</span>
                        {station.operatorId && (
                          <span className="flex items-center gap-1 ml-auto">
                            <User className="w-3 h-3" />
                            {(station.operatorId as any).fullName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader><CardTitle>{d.quickActions}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: d.qaMyTasks, icon: <ClipboardList className="w-5 h-5" />, path: '/technician/tasks', cls: 'text-primary bg-primary/5 border-primary/20' },
                { label: d.qaDiagnostics, icon: <Wrench className="w-5 h-5" />, path: '/technician/diagnostics', cls: 'text-warning bg-warning/5 border-warning/20' },
                { label: d.qaWorkHistory, icon: <CheckCircle2 className="w-5 h-5" />, path: '/technician/work-history', cls: 'text-success bg-success/5 border-success/20' },
                { label: d.qaMyProfile, icon: <User className="w-5 h-5" />, path: '/technician/profile', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
              ].map(({ label, icon, path, cls }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border hover:opacity-80 transition-opacity ${cls}`}
                >
                  {icon}
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
