import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { api } from '../../lib/api'
import type { SupportTicket } from '../../types'

// ── Status badge helper ──────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; className: string }> = {
  in_progress: { label: 'In Progress', className: 'bg-warning/10 text-warning' },
  open:        { label: 'Open',        className: 'bg-blue-100 text-blue-700' },
  resolved:    { label: 'Resolved',    className: 'bg-green-100 text-green-700' },
  closed:      { label: 'Closed',      className: 'bg-gray-100 text-gray-600' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}

// ── Category options (matches DB enum) ──────────────────────────────────────
const CATEGORIES = [
  { value: 'swap',    label: 'Swap Issue' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'account', label: 'Account Issue' },
]

// ── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  ticket: SupportTicket
  onClose: () => void
  onSaved: (updated: SupportTicket) => void
}

function EditModal({ ticket, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    subject:     ticket.subject,
    description: ticket.description,
    category:    ticket.category as string,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updated = await api.patch<SupportTicket>(`/support/tickets/${ticket._id}`, form)
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-ticket-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="edit-ticket-title" className="text-lg font-semibold text-gray-900">
            Edit Ticket <span className="text-sm text-gray-500 font-normal">#{ticket.ticketNumber}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Close edit modal"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select
              id="edit-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-subject">Subject</Label>
            <Input
              id="edit-subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Message</Label>
            <Textarea
              id="edit-description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Support Page ────────────────────────────────────────────────────────
export function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)

  // Submit form state
  const [form, setForm] = useState({
    category: '',
    subject:  '',
    message:  '',
  })
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // ── Fetch rider's tickets ──────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      const data = await api.get<SupportTicket[]>('/support/tickets')
      setTickets(Array.isArray(data) ? data : [])
    } catch {
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // ── Submit ticket ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!form.category) { setSubmitError('Please select a category'); return }
    if (!form.subject.trim()) { setSubmitError('Please enter a subject'); return }
    if (!form.message.trim()) { setSubmitError('Please enter a message'); return }

    setSubmitting(true)
    try {
      const newTicket = await api.post<SupportTicket>('/support/tickets', {
        category:    form.category,
        subject:     form.subject,
        description: form.message,
      })
      setTickets((prev) => [newTicket, ...prev])
      setForm({ category: '', subject: '', message: '' })
      setSubmitSuccess('Ticket submitted successfully! We will get back to you soon.')
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit saved callback ────────────────────────────────────────────────────
  const handleEditSaved = (updated: SupportTicket) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
    setEditingTicket(null)
  }

  // ── Format date ───────────────────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support &amp; Help</h1>
          <p className="text-gray-600 mt-1">Get assistance with your queries</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Submit Ticket ── */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              {submitSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {submitSuccess}
                </div>
              )}
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {submitError}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    required
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Describe your issue in detail..."
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ── My Tickets ── */}
          <Card>
            <CardHeader>
              <CardTitle>My Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <p>No tickets yet.</p>
                  <p className="mt-1">Submit a ticket using the form to get help.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      className="p-4 border rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">#{ticket.ticketNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={ticket.status} />
                          <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-400">
                          {formatDate(ticket.createdAt)}
                        </p>
                        {/* Only show edit for in_progress tickets */}
                        {ticket.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => setEditingTicket(ticket)}
                            className="text-xs text-primary hover:text-primary-600 font-medium hover:underline transition-colors"
                            aria-label={`Edit ticket ${ticket.ticketNumber}`}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      {editingTicket && (
        <EditModal
          ticket={editingTicket}
          onClose={() => setEditingTicket(null)}
          onSaved={handleEditSaved}
        />
      )}
    </DashboardLayout>
  )
}
