import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../lib/api'
import { AlertCircle, RefreshCw, MessageSquare, UserCheck } from 'lucide-react'

interface Rider {
  _id: string
  fullName: string
  phone: string
}

interface Technician {
  _id: string
  fullName: string
  phone: string
}

interface Ticket {
  _id: string
  ticketNumber: string
  riderId: Rider
  assignedTo?: Technician
  category: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolution?: string
  createdAt: string
}

interface TicketsResponse {
  tickets: Ticket[]
  total: number
  page: number
  pages: number
  stats: { open: number; inProgress: number; resolved: number; closed: number }
}

// ── Assign Modal ──────────────────────────────────────────────────────────────

function AssignModal({
  ticket,
  onClose,
  sa,
  ts,
}: {
  ticket: Ticket
  onClose: () => void
  sa: ReturnType<typeof useLanguage>['t']['admin']['support']
  ts: ReturnType<typeof useLanguage>['t']['technician']['support']
}) {
  const qc = useQueryClient()
  const [techId, setTechId] = useState(ticket.assignedTo?._id ?? '')

  const { data: techs = [], isLoading: techsLoading } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const result = await api.get<{ users: Technician[] }>('/users?role=technician&limit=100')
      return result?.users ?? []
    },
    staleTime: 60_000,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.put(`/support/tickets/${ticket._id}`, { assignedTo: techId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{sa.assignModal.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{ticket.ticketNumber} · {ticket.subject}</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              {sa.assignModal.techLabel}
            </label>
            {techsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : techs.length === 0 ? (
              <p className="text-sm text-gray-500">{sa.assignModal.noTechs}</p>
            ) : (
              <select
                value={techId}
                onChange={e => setTechId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{sa.assignModal.placeholder}</option>
                {techs.map(t => (
                  <option key={t._id} value={t._id}>{t.fullName} — {t.phone}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {sa.assignModal.cancel}
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !techId}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? sa.assignModal.assigning : sa.assignModal.assign}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resolve Modal ─────────────────────────────────────────────────────────────

function ResolveModal({
  ticket,
  onClose,
  ts,
}: {
  ticket: Ticket
  onClose: () => void
  ts: ReturnType<typeof useLanguage>['t']['technician']['support']
}) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<string>(
    ticket.status === 'open' || ticket.status === 'in_progress' ? 'resolved' : ticket.status,
  )
  const [resolution, setResolution] = useState(ticket.resolution ?? '')
  const [err, setErr] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.put(`/support/tickets/${ticket._id}`, { status, resolution }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] })
      onClose()
    },
  })

  const handleSave = () => {
    if ((status === 'resolved' || status === 'closed') && !resolution.trim()) {
      setErr(ts.modal.errResolution)
      return
    }
    setErr('')
    mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{ts.modal.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{ticket.ticketNumber}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{ts.modal.rider}</span>
              <p className="font-medium text-gray-900">{ticket.riderId?.fullName ?? '—'}</p>
              <p className="text-gray-500">{ticket.riderId?.phone}</p>
            </div>
            <div>
              <span className="text-gray-500">{ts.modal.category}</span>
              <p className="font-medium text-gray-900 capitalize">{ticket.category}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{ts.modal.subject}</p>
            <p className="text-sm text-gray-900">{ticket.subject}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{ts.modal.description}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{ts.modal.statusLabel}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="in_progress">{ts.modal.statusInProgress}</option>
              <option value="resolved">{ts.modal.statusResolved}</option>
              <option value="closed">{ts.modal.statusClosed}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{ts.modal.resolutionLabel}</label>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              rows={3}
              placeholder={ts.modal.resolutionPlaceholder}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            {ts.modal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? ts.modal.saving : ts.modal.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminSupport() {
  const { t } = useLanguage()
  const sa = t.admin.support
  const ts = t.technician.support

  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Ticket | null>(null)

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (categoryFilter) params.set('category', categoryFilter)
  if (search) params.set('search', search)
  params.set('page', String(page))

  const { data, isLoading, isError, refetch } = useQuery<TicketsResponse>({
    queryKey: ['admin-tickets', statusFilter, categoryFilter, search, page],
    queryFn: () => api.get(`/support/tech/tickets?${params.toString()}`),
  })

  const statusLabel: Record<string, string> = {
    open: ts.statusOpen,
    in_progress: ts.statusInProgress,
    resolved: ts.statusResolved,
    closed: ts.statusClosed,
  }

  const stats = data?.stats
  const statCards = [
    { label: ts.statTotal, value: data?.total ?? 0 },
    { label: ts.statOpen, value: stats?.open ?? 0, color: 'text-blue-600' },
    { label: ts.statInProgress, value: stats?.inProgress ?? 0, color: 'text-yellow-600' },
    { label: ts.statResolved, value: stats?.resolved ?? 0, color: 'text-green-600' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sa.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{sa.subtitle}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            {ts.refresh}
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color ?? 'text-gray-900'}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
          <div className="flex gap-1 flex-wrap">
            {(['', 'open', 'in_progress', 'resolved', 'closed'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setStatusFilter(v); setPage(1) }}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v === '' ? ts.filterAll : v === 'open' ? ts.filterOpen : v === 'in_progress' ? ts.filterInProgress : v === 'resolved' ? ts.filterResolved : ts.filterClosed}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{ts.categoryAll}</option>
            <option value="swap">{ts.catSwap}</option>
            <option value="payment">{ts.catPayment}</option>
            <option value="account">{ts.catAccount}</option>
            <option value="other">{ts.catOther}</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={ts.searchPlaceholder}
            className="flex-1 min-w-48 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-3">
              <AlertCircle className="w-6 h-6" />
              <button onClick={() => refetch()} className="text-sm underline">{ts.retry}</button>
            </div>
          ) : !data?.tickets.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <MessageSquare className="w-8 h-8" />
              <p className="font-medium">{ts.emptyTitle}</p>
              <p className="text-sm">{ts.emptyDesc}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[ts.colTicket, ts.colRider, ts.colCategory, ts.colSubject, ts.colStatus, sa.colAssigned, ts.colDate, ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.tickets.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{ticket.ticketNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{ticket.riderId?.fullName ?? '—'}</p>
                        <p className="text-xs text-gray-400">{ticket.riderId?.phone}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-700">{ticket.category}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{ticket.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] ?? ''}`}>
                          {statusLabel[ticket.status] ?? ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            <span className="text-xs text-gray-800">{ticket.assignedTo.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">{sa.unassigned}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAssignTarget(ticket)}
                            className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/40 rounded-md hover:bg-primary/5"
                          >
                            {ticket.assignedTo ? sa.reassignBtn : sa.assignBtn}
                          </button>
                          <button
                            onClick={() => setResolveTarget(ticket)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                          >
                            {ticket.status === 'resolved' || ticket.status === 'closed' ? ts.viewBtn : ts.resolveBtn}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {ts.page} {data.page} {ts.of} {data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  ‹
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          ticket={assignTarget}
          onClose={() => setAssignTarget(null)}
          sa={sa}
          ts={ts}
        />
      )}
      {resolveTarget && (
        <ResolveModal
          ticket={resolveTarget}
          onClose={() => setResolveTarget(null)}
          ts={ts}
        />
      )}
    </DashboardLayout>
  )
}
