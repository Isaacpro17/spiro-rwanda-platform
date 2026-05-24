import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { History, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SwapHistoryRow {
  id: string
  date: string
  stationName: string
  batteryOut: string
  batteryIn: string
  duration: string
  cost: string
  status: string
  statusLabel: string
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapSwapToRow(swap: any): SwapHistoryRow {
  return {
    id:          swap._id,
    date:        swap.startTime
                   ? new Date(swap.startTime).toLocaleDateString('en-CA')  // YYYY-MM-DD
                   : '—',
    stationName: swap.stationId?.name        || '—',
    batteryOut:  swap.depletedBatteryId?.serialNumber || '—',
    batteryIn:   swap.chargedBatteryId?.serialNumber  || '—',
    duration:    swap.durationMinutes != null ? `${swap.durationMinutes} min` : '—',
    cost:        swap.paymentId?.amountRwf
                   ? `RWF ${Number(swap.paymentId.amountRwf).toLocaleString()}`
                   : '—',
    status:      swap.status,
    statusLabel: swap.status === 'completed'   ? 'Completed'
               : swap.status === 'in_progress' ? 'In Progress'
               : swap.status === 'cancelled'   ? 'Cancelled'
               : swap.status ?? '—',
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <TableRow className="animate-pulse">
      {[120, 140, 90, 90, 60, 80, 80].map((w, i) => (
        <TableCell key={i}>
          <div className="h-3.5 bg-gray-200 rounded" style={{ width: w }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

// ── Page Component ────────────────────────────────────────────────────────────

export function SwapHistory() {
  const [rows, setRows]         = useState<SwapHistoryRow[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const swaps = await api.get<any[]>('/swaps/my-swaps')
      setRows((swaps ?? []).map(mapSwapToRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load swap history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const statusVariant = (status: string) =>
    status === 'completed'   ? 'success'     :
    status === 'in_progress' ? 'default'     :
    'destructive'

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Swap History</h1>
            <p className="text-gray-600 mt-1">View your past battery swaps</p>
          </div>
          {!isLoading && (
            <button
              onClick={load}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Refresh swap history"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={load} className="ml-auto text-error hover:text-error">
              Retry
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Swaps</CardTitle>
            {!isLoading && rows.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                {rows.length} record{rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">

            {/* Loading state */}
            {isLoading && (
              <div className="px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Battery Out</TableHead>
                      <TableHead>Battery In</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1,2,3,4,5].map(i => <TableRowSkeleton key={i} />)}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <History className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">No swaps yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Your completed battery swaps will appear here
                  </p>
                </div>
              </div>
            )}

            {/* Data table */}
            {!isLoading && !error && rows.length > 0 && (
              <div className="overflow-x-auto px-6 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Station</TableHead>
                      <TableHead className="whitespace-nowrap">Battery Out</TableHead>
                      <TableHead className="whitespace-nowrap">Battery In</TableHead>
                      <TableHead className="whitespace-nowrap">Duration</TableHead>
                      <TableHead className="whitespace-nowrap">Cost</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                          {row.date}
                        </TableCell>
                        <TableCell className="font-medium text-sm whitespace-nowrap">
                          {row.stationName}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm font-mono whitespace-nowrap">
                          {row.batteryOut}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm font-mono whitespace-nowrap">
                          {row.batteryIn}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                          {row.duration}
                        </TableCell>
                        <TableCell className="text-gray-700 text-sm font-medium whitespace-nowrap">
                          {row.cost}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)} className="text-xs whitespace-nowrap">
                            {row.statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
