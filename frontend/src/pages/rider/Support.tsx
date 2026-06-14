import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  HelpCircle, Search, ChevronDown, ChevronUp,
  MessageSquare, RefreshCw, CheckCircle, XCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { SupportTicket, FaqItem } from '../../types'

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  ticket: SupportTicket
  onClose: () => void
  onSaved: (updated: SupportTicket) => void
}

function EditModal({ ticket, onClose, onSaved }: EditModalProps) {
  const { t } = useLanguage()
  const su = t.rider.support
  const CATEGORIES = [
    { value: 'swap',    label: su.catSwap },
    { value: 'payment', label: su.catPayment },
    { value: 'account', label: su.catAccount },
    { value: 'other',   label: su.catOther },
  ]
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
            {su.editModal.title} <span className="text-sm text-gray-500 font-normal">#{ticket.ticketNumber}</span>
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl" aria-label="Close">×</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-category">{su.editModal.category}</Label>
            <Select id="edit-category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-subject">{su.editModal.subject}</Label>
            <Input id="edit-subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">{su.editModal.message}</Label>
            <Textarea id="edit-description" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>{su.editModal.cancel}</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? su.editModal.saving : su.editModal.saveChanges}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3.5 text-left text-sm font-medium text-gray-900 hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <span>{item.question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Support() {
  const { t } = useLanguage()
  const su = t.rider.support

  const CATEGORIES = [
    { value: 'swap',    label: su.catSwap },
    { value: 'payment', label: su.catPayment },
    { value: 'account', label: su.catAccount },
    { value: 'other',   label: su.catOther },
  ]

  const statusLabel = (status: string) =>
    status === 'in_progress' ? su.statusInProgress
    : status === 'open'      ? su.statusOpen
    : status === 'resolved'  ? su.statusResolved
    : status === 'closed'    ? su.statusClosed
    : status

  const statusVariant = (status: string): 'default' | 'success' | 'destructive' =>
    status === 'resolved' ? 'success'
    : status === 'closed' ? 'destructive'
    : 'default'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [faqQuery, setFaqQuery] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Submit form ──
  const [form, setForm] = useState({ category: '', subject: '', message: '' })
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // ── Fetch tickets ─────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.get<SupportTicket[]>('/support/tickets')
      setTickets(Array.isArray(data) ? data : [])
    } catch {
      // silently keep existing data on refresh error
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  // ── Fetch FAQ ─────────────────────────────────────────────────────────────
  const fetchFaqs = useCallback(async (q?: string) => {
    try {
      const url = q ? `/support/faq?q=${encodeURIComponent(q)}&lang=en` : '/support/faq?lang=en'
      const data = await api.get<FaqItem[]>(url)
      setFaqs(Array.isArray(data) ? data : [])
    } catch {
      setFaqs([])
    }
  }, [])

  useEffect(() => {
    setLoadingTickets(true)
    fetchTickets()
    fetchFaqs()

    // Poll for ticket updates every 30 seconds (real-time via polling)
    pollRef.current = setInterval(() => { fetchTickets() }, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchTickets, fetchFaqs])

  // ── FAQ search (debounced) ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { fetchFaqs(faqQuery || undefined) }, 300)
    return () => clearTimeout(t)
  }, [faqQuery, fetchFaqs])

  // ── Submit ticket ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!form.category)         { setSubmitError(su.pleaseSelectCategory); return }
    if (!form.subject.trim())   { setSubmitError(su.pleaseEnterSubject); return }
    if (!form.message.trim())   { setSubmitError(su.pleaseEnterMessage); return }

    setSubmitting(true)
    try {
      const newTicket = await api.post<SupportTicket>('/support/tickets', {
        category:    form.category,
        subject:     form.subject,
        description: form.message,
      })
      setTickets((prev) => [newTicket, ...prev])
      setForm({ category: '', subject: '', message: '' })
      setSubmitSuccess(su.ticketSuccess)
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSaved = (updated: SupportTicket) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
    setEditingTicket(null)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{su.title}</h1>
            <p className="text-gray-600 mt-1">{su.subtitle}</p>
          </div>
          <button
            onClick={() => { setLoadingTickets(true); fetchTickets() }}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ── FAQ Section ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                {su.faqTitle}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder={su.faqSearchPlaceholder}
                className="pl-9 h-9 text-sm"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                aria-label="Search FAQ"
              />
            </div>
            {faqs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {faqQuery ? su.faqNoResults.replace('{query}', faqQuery) : su.faqEmpty}
              </p>
            ) : (
              <div>
                {faqs.map((item) => <FaqRow key={item.id} item={item} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Submit + Tickets grid ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Submit Ticket */}
          <Card>
            <CardHeader>
              <CardTitle>{su.submitTicket}</CardTitle>
            </CardHeader>
            <CardContent>
              {submitSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg text-sm mb-4">
                  <CheckCircle className="w-4 h-4 shrink-0" />{submitSuccess}
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm mb-4">
                  <XCircle className="w-4 h-4 shrink-0" />{submitError}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="category">{su.category}</Label>
                  <Select id="category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required>
                    <option value="">{su.selectCategory}</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">{su.subject}</Label>
                  <Input
                    id="subject"
                    placeholder={su.subjectPlaceholder}
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{su.message}</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder={su.messagePlaceholder}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? su.submitting : su.submitBtn}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{su.myTickets}</CardTitle>
                {!loadingTickets && tickets.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {tickets.length !== 1
                      ? su.tickets.replace('{n}', String(tickets.length))
                      : su.ticket.replace('{n}', String(tickets.length))}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{su.noTickets}</p>
                  <p className="text-xs text-gray-400 mt-1">{su.noTicketsDesc}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {tickets.map((ticket) => (
                    <div key={ticket._id} className="p-4 border rounded-xl hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{ticket.subject}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">#{ticket.ticketNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={statusVariant(ticket.status)} className="text-xs">
                            {statusLabel(ticket.status)}
                          </Badge>
                          <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                      {ticket.resolution && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg">
                          <p className="text-xs text-green-700 font-medium">{su.resolution}</p>
                          <p className="text-xs text-green-600 mt-0.5">{ticket.resolution}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</p>
                        {ticket.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => setEditingTicket(ticket)}
                            className="text-xs text-primary hover:text-primary font-medium hover:underline transition-colors"
                          >
                            {su.editBtn}
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
