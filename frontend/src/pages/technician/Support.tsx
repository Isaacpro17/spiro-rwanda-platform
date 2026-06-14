import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useLanguage } from '../../contexts/LanguageContext'
import api from '../../lib/api'
import { AlertCircle, RefreshCw, MessageSquare } from 'lucide-react'

interface Rider {
  _id: string
  fullName: string
  phone: string
}

interface Ticket {
  _id: string
  ticketNumber: string
  riderId: Rider
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

interface ResolveModalProps {
  ticket: Ticket
  onClose: () => void
  t: ReturnType<typeof useLanguage>['t']['technician']['support']
}

function ResolveModal({ ticket, onClose, t }: ResolveModalProps) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<string>(ticket.status === 'open' || ticket.status === 'in_progress' ? 'resolved' : ticket.status)
  const [resolution, setResolution] = useState(ticket.resolution ?? '')
  const [err, setErr] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.put(`/support/tickets/${ticket._id}`, { status, resolution }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tech-tickets'] })
      onClose()
    },
  })

  const handleSave = () => {
    if ((status === 'resolved' || status === 'closed') && !resolution.trim()) {
      setErr(t.modal.errResolution)
      return
    }
    setErr('')
    mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t.modal.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{ticket.ticketNumber}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t.modal.rider}</span>
              <p className="font-medium text-gray-900">{ticket.riderId?.fullName ?? '—'}</p>
              <p className="text-gray-500">{ticket.riderId?.phone}</p>
            </div>
            <div>
              <span className="text-gray-500">{t.modal.category}</span>
              <p className="font-medium text-gray-900 capitalize">{ticket.category}</p>
              <span className="text-gray-500">{t.modal.submitted}</span>
              <p className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.modal.subject}</p>
            <p className="text-sm text-gray-900">{ticket.subject}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.modal.description}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.modal.statusLabel}</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="in_progress">{t.modal.statusInProgress}</option>
              <option value="resolved">{t.modal.statusResolved}</option>
              <option value="closed">{t.modal.statusClosed}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.modal.resolutionLabel}</label>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              rows={3}
              placeholder={t.modal.resolutionPlaceholder}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t.modal.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? t.modal.saving : t.modal.save}
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export function TechnicianSupport() {
  const { t } = useLanguage()
  const s = t.technician.support

  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Ticket | null>(null)

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (categoryFilter) params.set('category', categoryFilter)
  if (search) params.set('search', search)
  params.set('page', String(page))

  const { data, isLoading, isError, refetch } = useQuery<TicketsResponse>({
    queryKey: ['tech-tickets', statusFilter, categoryFilter, search, page],
    queryFn: () => api.get(`/support/tech/tickets?${params.toString()}`),
  })

  const statusLabel: Record<string, string> = {
    open: s.statusOpen,
    in_progress: s.statusInProgress,
    resolved: s.statusResolved,
    closed: s.statusClosed,
  }

  const stats = data?.stats
  const statCards = [
    { label: s.statTotal, value: (data?.total ?? 0) },
    { label: s.statOpen, value: stats?.open ?? 0, color: 'text-blue-600' },
    { label: s.statInProgress, value: stats?.inProgress ?? 0, color: 'text-yellow-600' },
    { label: s.statResolved, value: stats?.resolved ?? 0, color: 'text-green-600' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{s.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{s.subtitle}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            {s.refresh}
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
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {(['', 'open', 'in_progress', 'resolved', 'closed'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setStatusFilter(v); setPage(1) }}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v === '' ? s.filterAll : v === 'open' ? s.filterOpen : v === 'in_progress' ? s.filterInProgress : v === 'resolved' ? s.filterResolved : s.filterClosed}
              </button>
            ))}
          </div>
          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{s.categoryAll}</option>
            <option value="swap">{s.catSwap}</option>
            <option value="payment">{s.catPayment}</option>
            <option value="account">{s.catAccount}</option>
            <option value="other">{s.catOther}</option>
          </select>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={s.searchPlaceholder}
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
              <button onClick={() => refetch()} className="text-sm underline">{s.retry}</button>
            </div>
          ) : !data?.tickets.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <MessageSquare className="w-8 h-8" />
              <p className="font-medium">{s.emptyTitle}</p>
              <p className="text-sm">{s.emptyDesc}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[s.colTicket, s.colRider, s.colCategory, s.colSubject, s.colStatus, s.colDate, s.colActions].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
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
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(ticket)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                        >
                          {ticket.status === 'resolved' || ticket.status === 'closed' ? s.viewBtn : s.resolveBtn}
                        </button>
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
                {s.page} {data.page} {s.of} {data.pages}
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

      {selected && (
        <ResolveModal
          ticket={selected}
          onClose={() => setSelected(null)}
          t={s}
        />
      )}
    </DashboardLayout>
  )
}
