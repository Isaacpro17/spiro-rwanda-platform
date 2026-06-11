import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Clock, AlertCircle, RefreshCw, Loader2, Calendar,
  ChevronLeft, ChevronRight, User,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { StationDetail, StationReservation } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(status: string) {
  if (status === 'confirmed') return 'default'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'destructive'
  return 'warning'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  return `in ${hrs}h ${mins % 60}m`
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'today' | 'all'

const TAB_LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  today: 'Today',
  all: 'All',
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export function Reservations() {
  const { user } = useAuth()
  const [station, setStation] = useState<StationDetail | null>(null)
  const [reservations, setReservations] = useState<StationReservation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStation = useCallback(async () => {
    const stations = await api.get<StationDetail[]>('/stations')
    return (stations ?? []).find(
      (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
    ) ?? null
  }, [user?._id])

  const loadReservations = useCallback(async (stationId: string, p: number, currentTab: Tab) => {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
    if (currentTab === 'upcoming') {
      params.set('upcoming', 'true')
    } else if (currentTab === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      params.set('startDate', start.toISOString())
      params.set('endDate', end.toISOString())
    }
    const result = await api.get<any>(`/stations/${stationId}/reservations?${params}`)
    setReservations(result?.reservations ?? [])
    setTotal(result?.total ?? 0)
  }, [])

  const initialLoad = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loadStation()
      if (!s) throw new Error('No station assigned to your account')
      setStation(s)
      await loadReservations(s._id, 1, tab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadReservations, tab])

  useEffect(() => { initialLoad() }, [initialLoad])

  useEffect(() => {
    if (!station) return
    setIsLoading(true)
    loadReservations(station._id, page, tab).finally(() => setIsLoading(false))
  }, [station, page, tab, loadReservations])

  // 30-second auto-refresh
  useEffect(() => {
    if (!station) return
    pollRef.current = setInterval(() => loadReservations(station._id, page, tab), 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [station, page, tab, loadReservations])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
            <p className="text-gray-600 mt-1">
              {station ? `${station.name} — manage swap reservations` : 'Manage swap reservations'}
            </p>
          </div>
          <button
            onClick={initialLoad}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh reservations"
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

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Table card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>
              {TAB_LABELS[tab]} Reservations
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No reservations found</p>
                <p className="text-xs text-gray-500">
                  {tab === 'upcoming'
                    ? 'No upcoming reservations at this station'
                    : tab === 'today'
                    ? 'No reservations today'
                    : 'No reservations recorded'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto px-6 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rider</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Reserved For</TableHead>
                        {tab === 'upcoming' && <TableHead>Time Until</TableHead>}
                        <TableHead>Position</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((res) => (
                        <TableRow key={res._id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-medium">
                                {(res.riderId as any)?.fullName ?? 'Unknown Rider'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {(res.riderId as any)?.phone ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {formatTime(res.reservedTime)}
                            </div>
                          </TableCell>
                          {tab === 'upcoming' && (
                            <TableCell className="text-sm whitespace-nowrap">
                              <span className={
                                new Date(res.reservedTime).getTime() - Date.now() < 0
                                  ? 'text-error font-medium'
                                  : new Date(res.reservedTime).getTime() - Date.now() < 900000
                                  ? 'text-warning font-medium'
                                  : 'text-gray-600'
                              }>
                                {timeUntil(res.reservedTime)}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-sm text-gray-600">#{res.queuePosition ?? '—'}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {res.cancellationCode}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(res.status)} className="text-xs capitalize">
                              {res.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">Page {page} of {totalPages} · {total} total</span>
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
    </DashboardLayout>
  )
}
