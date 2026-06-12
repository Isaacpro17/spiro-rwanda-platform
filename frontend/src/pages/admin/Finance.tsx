import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import {
  TrendingUp, Search, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, X, CheckCircle2, XCircle,
  Clock, RotateCcw, DollarSign,
} from 'lucide-react'
import { api } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  _id: string
  transactionId: string
  provider: string
  amountRwf: number
  riderId?: { fullName: string; phone: string; email?: string }
  senderPhone?: string
  type?: string
  status: 'pending' | 'success' | 'failed'
  refunded?: boolean
  createdAt: string
}

interface TxStats {
  total: number
  byStatus: Record<string, number>
  byProvider: Record<string, number>
  todayTransactions: number
  todayRevenue: number
  totalRevenue: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(s: string, refunded?: boolean) {
  if (refunded) return 'secondary' as const
  if (s === 'success') return 'success' as const
  if (s === 'failed') return 'destructive' as const
  return 'warning' as const
}

function fmtRwf(n: number) {
  return `RWF ${n.toLocaleString()}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function providerLabel(p: string) {
  if (p === 'mtn_momo') return 'MTN MoMo'
  if (p === 'airtel_money') return 'Airtel Money'
  return p
}

// ── Refund Modal ──────────────────────────────────────────────────────────────

function RefundModal({
  tx, onClose, onSuccess,
}: { tx: Transaction; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleRefund = async () => {
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/payments/${tx._id}/refund`, { reason })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Refund failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Process Refund</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl mb-4">
          <p className="text-xs text-gray-500 mb-1">Transaction</p>
          <p className="text-sm font-mono font-medium text-gray-900">{tx.transactionId}</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{fmtRwf(tx.amountRwf)}</p>
          <p className="text-xs text-gray-500">{tx.riderId?.fullName ?? tx.senderPhone}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Refund Reason *</Label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this transaction is being refunded…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleRefund} disabled={saving} className="flex-1 bg-warning hover:bg-warning/90 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
              Refund
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TxStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)

  const loadData = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (providerFilter) params.set('provider', providerFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const [txRes, statsRes] = await Promise.all([
        api.get<{ transactions: Transaction[]; pagination: { total: number } }>(`/payments/transactions?${params}`),
        api.get<TxStats>('/payments/transactions/stats'),
      ])
      setTransactions((txRes as any)?.transactions ?? [])
      setTotal((txRes as any)?.pagination?.total ?? 0)
      setStats(statsRes as any ?? null)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, providerFilter, startDate, endDate])

  useEffect(() => { setPage(1); loadData(1) }, [search, statusFilter, providerFilter, startDate, endDate]) // eslint-disable-line
  useEffect(() => { loadData(page) }, [page]) // eslint-disable-line

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
            <p className="text-gray-600 mt-1">Transaction history, revenue tracking, and refunds</p>
          </div>
          <button onClick={() => loadData(page)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(page)} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Revenue', value: fmtRwf(stats.totalRevenue),
                icon: <TrendingUp className="w-5 h-5" />, color: 'text-success',
              },
              {
                label: "Today's Revenue", value: fmtRwf(stats.todayRevenue),
                icon: <DollarSign className="w-5 h-5" />, color: 'text-primary',
              },
              {
                label: 'Successful Txns', value: (stats.byStatus.success ?? 0).toLocaleString(),
                icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-success',
              },
              {
                label: 'Failed Txns', value: (stats.byStatus.failed ?? 0).toLocaleString(),
                icon: <XCircle className="w-5 h-5" />, color: 'text-error',
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">{s.icon}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Provider split */}
        {stats && Object.keys(stats.byProvider).length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(stats.byProvider).map(([provider, count]) => (
              <Card key={provider}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{providerLabel(provider)}</p>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{count.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">transactions</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
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
                <Input className="pl-9" placeholder="Search by transaction ID or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Providers</option>
                <option value="mtn_momo">MTN MoMo</option>
                <option value="airtel_money">Airtel Money</option>
              </select>
              <div className="flex gap-2 items-end">
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">From</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-gray-500">To</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              Transactions
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No transactions found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx._id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <span className="text-xs font-mono text-gray-700">{tx.transactionId}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-gray-900">{tx.riderId?.fullName ?? '—'}</p>
                              <p className="text-xs text-gray-500">{tx.riderId?.phone ?? tx.senderPhone ?? ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-gray-900">{fmtRwf(tx.amountRwf)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{providerLabel(tx.provider)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={statusVariant(tx.status, tx.refunded)} className="text-xs">
                                {tx.refunded ? 'Refunded' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </Badge>
                              {tx.status === 'pending' && <Clock className="w-3.5 h-3.5 text-warning" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {fmtDate(tx.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.status === 'success' && !tx.refunded && (
                              <button
                                onClick={() => setRefundTarget(tx)}
                                className="text-xs text-warning hover:underline font-medium flex items-center gap-1 ml-auto"
                              >
                                <RotateCcw className="w-3 h-3" />Refund
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">Page {page} of {totalPages} · {total} transactions</span>
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

      {refundTarget && (
        <RefundModal tx={refundTarget} onClose={() => setRefundTarget(null)} onSuccess={() => loadData(page)} />
      )}
    </DashboardLayout>
  )
}
