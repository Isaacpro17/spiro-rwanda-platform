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
  History, AlertCircle, RefreshCw, Download, Loader2,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'

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
  paymentId?: string
}

interface Filters {
  status: string
  startDate: string
  endDate: string
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapSwapToRow(swap: any): SwapHistoryRow {
  return {
    id:          swap._id,
    date:        swap.startTime ? new Date(swap.startTime).toLocaleDateString('en-CA') : '—',
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
    paymentId:   swap.paymentId?._id,
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <TableRow className="animate-pulse">
      {[120, 140, 90, 90, 60, 80, 80, 40].map((w, i) => (
        <TableCell key={i}><div className="h-3.5 bg-gray-200 rounded" style={{ width: w }} /></TableCell>
      ))}
    </TableRow>
  )
}

// ── Page Component ─────────────────────────────────────────────────────────────

export function SwapHistory() {
  const { t } = useLanguage()
  const h = t.rider.history

  const swapLabel = (status: string) =>
    status === 'completed' ? h.statusCompleted
    : status === 'in_progress' ? h.statusInProgress
    : status === 'cancelled' ? h.statusCancelled
    : status

  const [rows, setRows]           = useState<SwapHistoryRow[]>([])
  const [isLoading, setLoading]   = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [page, setPage]           = useState(1)
  const [, setTotalRows] = useState(0)
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<Filters>({ status: '', startDate: '', endDate: '' })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ status: '', startDate: '', endDate: '' })

  const PAGE_SIZE = 10

  const load = useCallback(async (p: number, f: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) })
      if (f.status)    params.set('status', f.status)
      if (f.startDate) params.set('startDate', f.startDate)
      if (f.endDate)   params.set('endDate', new Date(f.endDate + 'T23:59:59').toISOString())

      const swaps = await api.get<any[]>(`/swaps/my-swaps?${params.toString()}`)
      setRows((swaps ?? []).map(mapSwapToRow))
      // Use array length since the endpoint doesn't return total count (yet)
      if (p === 1) setTotalRows((swaps ?? []).length < PAGE_SIZE ? (swaps ?? []).length : PAGE_SIZE * 2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load swap history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, appliedFilters) }, [load, page, appliedFilters])

  const applyFilters = () => {
    setAppliedFilters({ ...filters })
    setPage(1)
    setShowFilters(false)
  }

  const clearFilters = () => {
    const empty = { status: '', startDate: '', endDate: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  const hasActiveFilters = appliedFilters.status || appliedFilters.startDate || appliedFilters.endDate

  const statusVariant = (status: string) =>
    status === 'completed' ? 'success' : status === 'in_progress' ? 'default' : 'destructive'

  const handleInvoice = async (paymentId: string) => {
    setInvoiceLoading(paymentId)
    try {
      const invoice = await api.get<Record<string, unknown>>(`/payments/${paymentId}/invoice`)
      const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${paymentId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently ignore
    } finally {
      setInvoiceLoading(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{h.title}</h1>
            <p className="text-gray-600 mt-1">{h.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                hasActiveFilters
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              aria-label="Toggle filters"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              {hasActiveFilters && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            </button>
            <button
              onClick={() => load(page, appliedFilters)}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Refresh swap history"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-status" className="text-xs">{h.filterStatus}</Label>
                  <Select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">{h.allStatuses}</option>
                    <option value="completed">{h.statusCompleted}</option>
                    <option value="in_progress">{h.statusInProgress}</option>
                    <option value="cancelled">{h.statusCancelled}</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-start" className="text-xs">{h.filterFromDate}</Label>
                  <Input
                    id="filter-start"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-end" className="text-xs">{h.filterToDate}</Label>
                  <Input
                    id="filter-end"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={applyFilters}>{h.applyFilters}</Button>
                {hasActiveFilters && (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    <X className="w-3.5 h-3.5 mr-1" /> {h.clear}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => load(page, appliedFilters)} className="ml-auto text-error">
              {h.retry}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>{h.swapRecords}</CardTitle>
            {!isLoading && rows.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                {rows.length !== 1
                  ? h.results.replace('{n}', String(rows.length))
                  : h.result.replace('{n}', String(rows.length))}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">

            {/* Loading */}
            {isLoading && (
              <div className="px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[h.colDate, h.colStation, h.colBatteryOut, h.colBatteryIn, h.colDuration, h.colCost, h.colStatus, ''].map((col, i) => (
                        <TableHead key={i}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>{[1,2,3,4,5].map(i => <RowSkeleton key={i} />)}</TableBody>
                </Table>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <History className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {hasActiveFilters ? h.noMatchFilters : h.noSwapsYet}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {hasActiveFilters ? h.tryAdjusting : h.noSwapsDesc}
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>{h.clearFilters}</Button>
                )}
              </div>
            )}

            {/* Data table */}
            {!isLoading && !error && rows.length > 0 && (
              <div className="overflow-x-auto px-6 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">{h.colDate}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colStation}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colBatteryOut}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colBatteryIn}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colDuration}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colCost}</TableHead>
                      <TableHead className="whitespace-nowrap">{h.colStatus}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">{row.date}</TableCell>
                        <TableCell className="font-medium text-sm whitespace-nowrap">{row.stationName}</TableCell>
                        <TableCell className="text-gray-600 text-sm font-mono whitespace-nowrap">{row.batteryOut}</TableCell>
                        <TableCell className="text-gray-600 text-sm font-mono whitespace-nowrap">{row.batteryIn}</TableCell>
                        <TableCell className="text-gray-600 text-sm whitespace-nowrap">{row.duration}</TableCell>
                        <TableCell className="text-gray-700 text-sm font-medium whitespace-nowrap">{row.cost}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)} className="text-xs whitespace-nowrap">
                            {swapLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.paymentId && (
                            <button
                              type="button"
                              onClick={() => handleInvoice(row.paymentId!)}
                              disabled={invoiceLoading === row.paymentId}
                              className="p-1.5 text-gray-400 hover:text-primary rounded-md hover:bg-primary/5 transition-colors"
                              aria-label="Download invoice"
                            >
                              {invoiceLoading === row.paymentId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && (rows.length === PAGE_SIZE || page > 1) && (
              <div className="flex items-center justify-between px-6 pt-4 pb-4 border-t">
                <span className="text-xs text-gray-500">{h.page} {page}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={rows.length < PAGE_SIZE || isLoading}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
