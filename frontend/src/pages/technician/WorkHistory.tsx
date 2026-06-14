import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  CheckCircle2, AlertCircle, RefreshCw, Loader2, Clock,
  MapPin, ChevronLeft, ChevronRight, TrendingUp, Wrench, Calendar,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationMaintenanceRequest } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyVariant(u: string) {
  if (u === 'critical' || u === 'high') return 'destructive' as const
  if (u === 'medium') return 'warning' as const
  return 'default' as const
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolutionTime(created: string, resolved: string) {
  const diffMs = new Date(resolved).getTime() - new Date(created).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return `${Math.floor(diffMs / 60000)}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, valueColor }: {
  label: string; value: string | number; icon: React.ReactNode; valueColor: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function WorkHistory() {
  const { t } = useLanguage()
  const h = t.technician.history
  const [tasks, setTasks] = useState<StationMaintenanceRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const defaultEnd = isoDate(new Date())
  const defaultStart = isoDate(new Date(Date.now() - 29 * 86400000))
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  const loadHistory = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        status: 'resolved',
        page: String(p),
        limit: String(PAGE_SIZE),
      })
      const result = await api.get<{ tasks: StationMaintenanceRequest[]; total: number }>(
        `/technicians/my-tasks?${params}`
      )
      setTasks((result as any)?.tasks ?? [])
      setTotal((result as any)?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work history')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory(page) }, [page, loadHistory])

  const filtered = tasks.filter((task) => {
    const d = task.resolvedAt ?? task.updatedAt
    if (!d) return true
    const ts = new Date(d).getTime()
    const from = startDate ? new Date(startDate).getTime() : 0
    const to = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity
    return ts >= from && ts <= to
  })

  const urgencyCounts = filtered.reduce(
    (acc, task) => { acc[task.urgency] = (acc[task.urgency] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  const avgResolutionMs = filtered.reduce((acc, task) => {
    if (!task.resolvedAt) return acc
    return acc + (new Date(task.resolvedAt).getTime() - new Date(task.createdAt).getTime())
  }, 0) / (filtered.filter((task) => task.resolvedAt).length || 1)

  const avgResolutionHours = Math.round(avgResolutionMs / 3600000)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{h.title}</h1>
            <p className="text-gray-600 mt-1">{h.subtitle}</p>
          </div>
          <button
            onClick={() => loadHistory(page)}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadHistory(page)} className="ml-auto text-error">{h.retry}</Button>
          </div>
        )}

        {/* Date filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{h.from}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{h.to}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="flex gap-1.5 ml-auto">
                {[
                  { label: h.preset7, days: 7 },
                  { label: h.preset30, days: 30 },
                  { label: h.preset90, days: 90 },
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => {
                      setStartDate(isoDate(new Date(Date.now() - (days - 1) * 86400000)))
                      setEndDate(isoDate(new Date()))
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label={h.statResolved}
              value={filtered.length}
              icon={<CheckCircle2 className="w-5 h-5" />}
              valueColor="text-success"
            />
            <SummaryCard
              label={h.statAvgTime}
              value={`${avgResolutionHours}h`}
              icon={<Clock className="w-5 h-5" />}
              valueColor="text-primary"
            />
            <SummaryCard
              label={h.statCritical}
              value={(urgencyCounts['critical'] ?? 0) + (urgencyCounts['high'] ?? 0)}
              icon={<TrendingUp className="w-5 h-5" />}
              valueColor="text-error"
            />
            <SummaryCard
              label={h.statTotal}
              value={total}
              icon={<Wrench className="w-5 h-5" />}
              valueColor="text-gray-900"
            />
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {h.cardTitle}
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length} shown)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{h.emptyTitle}</p>
                <p className="text-xs text-gray-500">{h.emptyDesc}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto px-6 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{h.colDateResolved}</TableHead>
                        <TableHead>{h.colStation}</TableHead>
                        <TableHead>{h.colEquipment}</TableHead>
                        <TableHead>{h.colUrgency}</TableHead>
                        <TableHead>{h.colResolutionTime}</TableHead>
                        <TableHead>{h.colNotes}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((task) => {
                        const stationName = typeof task.stationId === 'object' ? task.stationId.name : '—'
                        return (
                          <TableRow key={task._id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="text-sm whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                {task.resolvedAt ? fmtDate(task.resolvedAt) : '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm flex items-center gap-1 text-gray-700">
                                <MapPin className="w-3 h-3 text-gray-400" />{stationName}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900 font-medium max-w-[180px] truncate">
                              {task.equipment}
                            </TableCell>
                            <TableCell>
                              <Badge variant={urgencyVariant(task.urgency)} className="text-xs capitalize">
                                {task.urgency}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                              {task.resolvedAt
                                ? resolutionTime(task.createdAt, task.resolvedAt)
                                : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                              {task.notes || <span className="text-gray-300 italic">—</span>}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">
                      {h.page} {page} {h.of} {totalPages} · {total} {h.totalResolved}
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
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
