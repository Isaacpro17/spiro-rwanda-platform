import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import {
  BadgeCheck, Search, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, X, Trash2, Users,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  _id: string
  name: string
  priceRwf: number
  swapsPerMonth?: number
}

interface Subscriber {
  _id: string
  userId: { _id: string; fullName: string; phone: string; email?: string; isActive: boolean } | null
  subscriptionPlanId: Plan | null
  walletBalance: number
  updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRwf(n: number) {
  return `RWF ${n.toLocaleString()}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Remove Confirmation Modal ─────────────────────────────────────────────────

interface RemoveModalProps {
  subscriber: Subscriber
  onClose: () => void
  onSuccess: () => void
}

function RemoveModal({ subscriber, onClose, onSuccess }: RemoveModalProps) {
  const { t } = useLanguage()
  const rm = t.admin.subscriptions.removeModal
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  const name = subscriber.userId?.fullName ?? '—'
  const plan = subscriber.subscriptionPlanId?.name ?? '—'
  const riderId = subscriber.userId?._id

  const handleRemove = async () => {
    if (!riderId) return
    setRemoving(true)
    setError('')
    try {
      await api.delete(`/subscriptions/subscriber/${riderId}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to remove subscription')
    } finally {
      setRemoving(false)
    }
  }

  const desc = rm.desc.replace('{name}', name).replace('{plan}', plan)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{rm.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl mb-4">
          <p className="text-sm text-gray-700">{desc}</p>
        </div>

        {error && (
          <p className="text-xs text-error flex items-center gap-1.5 mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{rm.cancel}</Button>
          <Button
            size="sm"
            onClick={handleRemove}
            disabled={removing}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
          >
            {removing
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{rm.removing}</>
              : <><Trash2 className="w-4 h-4 mr-1" />{rm.remove}</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function Subscriptions() {
  const { t } = useLanguage()
  const s = t.admin.subscriptions

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [planFilter, setPlanFilter] = useState('')

  const [removeTarget, setRemoveTarget] = useState<Subscriber | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadPlans = useCallback(async () => {
    try {
      const res = await api.get<any>('/subscriptions/plans')
      setPlans(res.data.data ?? [])
    } catch { /* non-critical */ }
  }, [])

  const loadSubscribers = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
        ...(planFilter ? { planId: planFilter } : {}),
      })
      const res = await api.get<any>(`/subscriptions/subscribers?${params}`)
      const data = res.data.data
      setSubscribers(data.subscribers ?? [])
      setTotal(data.total ?? 0)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load subscribers')
    } finally {
      setIsLoading(false)
    }
  }, [planFilter])

  useEffect(() => { loadPlans() }, [loadPlans])
  useEffect(() => { setPage(1); loadSubscribers(1) }, [planFilter, loadSubscribers])
  useEffect(() => { loadSubscribers(page) }, [page, loadSubscribers])

  // Client-side filter by name / phone (data is already paginated, filter within page)
  const filtered = search.trim()
    ? subscribers.filter((sub) => {
        const q = search.trim().toLowerCase()
        return (
          sub.userId?.fullName?.toLowerCase().includes(q) ||
          sub.userId?.phone?.includes(q)
        )
      })
    : subscribers

  const handleRemoveSuccess = () => {
    loadSubscribers(page)
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-gray-900">{s.title}</h1>
            </div>
            <p className="text-sm text-gray-500">{s.subtitle}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadSubscribers(page)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stat card */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{s.statSubscribers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={s.searchPlaceholder}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{s.allPlans}</option>
            {plans.map((pl) => (
              <option key={pl._id} value={pl._id}>{pl.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => loadSubscribers(page)} className="ml-auto">
              {s.retry}
            </Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{s.cardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <BadgeCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">{s.emptyTitle}</p>
                <p className="text-sm mt-1">{s.emptyDesc}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{s.colRider}</TableHead>
                      <TableHead>{s.colPhone}</TableHead>
                      <TableHead>{s.colPlan}</TableHead>
                      <TableHead>{s.colPrice}</TableHead>
                      <TableHead>{s.colSwaps}</TableHead>
                      <TableHead className="text-right">{s.colActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{sub.userId?.fullName ?? '—'}</p>
                            <p className="text-xs text-gray-400">{fmtDate(sub.updatedAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{sub.userId?.phone ?? '—'}</TableCell>
                        <TableCell>
                          {sub.subscriptionPlanId ? (
                            <Badge variant="success" className="text-xs">
                              {sub.subscriptionPlanId.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">
                          {sub.subscriptionPlanId ? fmtRwf(sub.subscriptionPlanId.priceRwf) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {sub.subscriptionPlanId?.swapsPerMonth ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRemoveTarget(sub)}
                            className="text-error border-error/30 hover:bg-error/5 hover:border-error/50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {s.removeBtn}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {s.page} {page} {s.of} {totalPages} — {total.toLocaleString()} {s.totalSubscribers}
                </p>
                <div className="flex gap-1">
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

      {/* Remove modal */}
      {removeTarget && (
        <RemoveModal
          subscriber={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </DashboardLayout>
  )
}
