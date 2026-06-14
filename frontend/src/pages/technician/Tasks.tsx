import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, AlertCircle,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, X, User,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationMaintenanceRequest } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'in_progress' | 'resolved'

const TAB_STATUSES: Record<TabKey, string[]> = {
  pending: ['open', 'assigned'],
  in_progress: ['in_progress'],
  resolved: ['resolved'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyVariant(u: string) {
  if (u === 'critical' || u === 'high') return 'destructive' as const
  if (u === 'medium') return 'warning' as const
  return 'default' as const
}

function statusVariant(s: string) {
  if (s === 'resolved') return 'success' as const
  if (s === 'in_progress') return 'warning' as const
  if (s === 'assigned') return 'default' as const
  return 'destructive' as const
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Resolve Modal ─────────────────────────────────────────────────────────────

interface ResolveModalProps {
  task: StationMaintenanceRequest
  onClose: () => void
  onResolve: (taskId: string, notes: string) => Promise<void>
}

function ResolveModal({ task, onClose, onResolve }: ResolveModalProps) {
  const { t } = useLanguage()
  const rm = t.technician.tasks.resolveModal
  const [notes, setNotes] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setErr('')
    try {
      await onResolve(task._id, notes)
      onClose()
    } catch (e: any) {
      setErr(e.message || 'Failed to update task')
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
          <p className="font-medium text-gray-800">{task.equipment}</p>
          <p className="text-gray-500 text-xs mt-0.5">{task.faultDescription}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              {rm.notesLabel}
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={rm.placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {err && (
            <p className="text-xs text-error flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{err}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{rm.cancel}</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {rm.markResolved}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: StationMaintenanceRequest
  onStart: (id: string) => void
  onResolve: (task: StationMaintenanceRequest) => void
}

function TaskCard({ task, onStart, onResolve }: TaskCardProps) {
  const { t } = useLanguage()
  const tk = t.technician.tasks
  const stationName = typeof task.stationId === 'object' ? task.stationId.name : '—'
  const isOpen = task.status === 'open' || task.status === 'assigned'
  const isInProgress = task.status === 'in_progress'

  const getStatusLabel = (s: string) => {
    if (s === 'open') return tk.statusOpen
    if (s === 'assigned') return tk.statusAssigned
    if (s === 'in_progress') return tk.statusInProgress
    if (s === 'resolved') return tk.statusResolved
    return s
  }

  return (
    <div className={`p-4 border rounded-xl transition-colors ${
      task.urgency === 'critical' ? 'border-error/30 bg-error/5' :
      task.urgency === 'high' ? 'border-warning/30' : ''
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
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

          <p className="font-semibold text-sm text-gray-900">{task.equipment}</p>
          <p className="text-sm text-gray-600 mt-1">{task.faultDescription}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />{stationName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{fmtDate(task.createdAt)} ({timeAgo(task.createdAt)})
            </span>
            {task.createdByOperator && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />{tk.reportedBy} {task.createdByOperator.fullName}
              </span>
            )}
          </div>

          {task.notes && (
            <div className="mt-2 text-xs text-gray-600 bg-white border rounded-lg px-3 py-2">
              <span className="font-medium">{tk.notes}:</span> {task.notes}
            </div>
          )}

          {task.resolvedAt && (
            <p className="mt-2 text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />{tk.resolvedOn} {fmtDate(task.resolvedAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {isOpen && (
            <Button size="sm" variant="outline" onClick={() => onStart(task._id)}>
              {tk.startWork}
            </Button>
          )}
          {isInProgress && (
            <Button size="sm" onClick={() => onResolve(task)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {tk.resolve}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export function Tasks() {
  const { t } = useLanguage()
  const tk = t.technician.tasks
  const [tab, setTab] = useState<TabKey>('pending')
  const [tasks, setTasks] = useState<StationMaintenanceRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<StationMaintenanceRequest | null>(null)

  const tabLabels: Record<TabKey, string> = {
    pending: tk.tabPending,
    in_progress: tk.tabInProgress,
    resolved: tk.tabResolved,
  }

  const emptyMessages: Record<TabKey, string> = {
    pending: tk.emptyPending,
    in_progress: tk.emptyInProgress,
    resolved: tk.emptyResolved,
  }

  const loadTasks = useCallback(async (currentTab: TabKey, p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const statuses = TAB_STATUSES[currentTab].join(',')
      const params = new URLSearchParams({
        status: statuses,
        page: String(p),
        limit: String(PAGE_SIZE),
      })
      const result = await api.get<{ tasks: StationMaintenanceRequest[]; total: number }>(
        `/technicians/my-tasks?${params}`
      )
      setTasks((result as any)?.tasks ?? [])
      setTotal((result as any)?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    loadTasks(tab, 1)
  }, [tab, loadTasks])

  useEffect(() => {
    loadTasks(tab, page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async (taskId: string) => {
    try {
      const updated = await api.put<StationMaintenanceRequest>(`/technicians/tasks/${taskId}`, { status: 'in_progress' })
      setTasks((prev) => prev.map((task) => task._id === taskId ? (updated ?? task) : task))
      setTab('in_progress')
      setPage(1)
    } catch (e: any) {
      setError(e.message || 'Failed to start task')
    }
  }

  const handleResolve = async (taskId: string, notes: string) => {
    const updated = await api.put<StationMaintenanceRequest>(`/technicians/tasks/${taskId}`, {
      status: 'resolved',
      notes,
    })
    setTasks((prev) => prev.filter((task) => task._id !== taskId))
    setTotal((prev) => Math.max(0, prev - 1))
    if (updated) {
      setTab('resolved')
      setPage(1)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tk.title}</h1>
            <p className="text-gray-600 mt-1">{tk.subtitle}</p>
          </div>
          <button
            onClick={() => loadTasks(tab, page)}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadTasks(tab, page)} className="ml-auto text-error">
              {tk.retry}
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(Object.keys(TAB_STATUSES) as TabKey[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === tabKey
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tabLabels[tabKey]}
            </button>
          ))}
        </div>

        {/* Task list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {tabLabels[tab]}
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{tk.emptyTitle}</p>
                <p className="text-xs text-gray-500">{emptyMessages[tab]}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStart={handleStart}
                    onResolve={setResolveTarget}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-gray-500">
                  {tk.page} {page} {tk.of} {totalPages} · {total} {tk.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {resolveTarget && (
        <ResolveModal
          task={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolve={handleResolve}
        />
      )}
    </DashboardLayout>
  )
}
