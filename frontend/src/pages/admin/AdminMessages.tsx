import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { api } from '../../lib/api'
import { Mail, RefreshCw, Archive, CheckCircle, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

interface ContactMessage {
  _id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  createdAt: string
}

interface MessagesResponse {
  messages: ContactMessage[]
  total: number
  page: number
  pages: number
}

// ── Message Details Modal ───────────────────────────────────────────────────

function MessageModal({
  message,
  onClose,
}: {
  message: ContactMessage
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: async (status: ContactMessage['status']) => {
      await api.patch(`/contact/${message._id}/status`, { status })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-xl">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{message.subject}</CardTitle>
              <CardDescription>
                From: {message.name} &lt;{message.email}&gt; • {message.phone}
              </CardDescription>
              <div className="text-xs text-gray-500 mt-1">
                {format(new Date(message.createdAt), 'PPP p')}
              </div>
            </div>
            <Badge
              variant={
                message.status === 'new'
                  ? 'destructive'
                  : message.status === 'replied'
                  ? 'success'
                  : message.status === 'archived'
                  ? 'outline'
                  : 'secondary'
              }
            >
              {message.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100 whitespace-pre-wrap text-gray-700">
            {message.message}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Close
            </Button>
            
            {message.status !== 'read' && message.status !== 'replied' && message.status !== 'archived' && (
              <Button
                variant="outline"
                onClick={() => updateStatus('read')}
                disabled={isPending}
              >
                Mark as Read
              </Button>
            )}

            {message.status !== 'replied' && (
              <Button
                onClick={() => updateStatus('replied')}
                disabled={isPending}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Replied
              </Button>
            )}

            {message.status !== 'archived' && (
              <Button
                variant="destructive"
                onClick={() => updateStatus('archived')}
                disabled={isPending}
                className="gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminMessages() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null)

  const { data, isLoading, refetch } = useQuery<MessagesResponse>({
    queryKey: ['admin-messages', page, statusFilter],
    queryFn: async () => {
      let url = `/contact?page=${page}&limit=10`
      if (statusFilter) url += `&status=${statusFilter}`
      const res = await api.get<{ data: MessagesResponse }>(url)
      return res.data
    },
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              Contact Messages
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Read and manage messages submitted via the public contact form.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-gray-600 whitespace-nowrap">Filter Status:</Label>
              <select
                className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <Card className="shadow-sm border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Sender</th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading messages...
                    </td>
                  </tr>
                ) : data?.messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No messages found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  data?.messages.map((msg) => (
                    <tr
                      key={msg._id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedMsg(msg)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(msg.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{msg.name}</div>
                        <div className="text-gray-500">{msg.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium truncate max-w-[250px]">
                          {msg.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            msg.status === 'new'
                              ? 'destructive'
                              : msg.status === 'replied'
                              ? 'success'
                              : msg.status === 'archived'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {msg.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.pages} (Total: {data.total})
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.pages}
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {selectedMsg && (
        <MessageModal
          message={selectedMsg}
          onClose={() => {
            setSelectedMsg(null)
            // If they open a "new" message, automatically mark it as read? (Optional)
            // The modal handles this manually for now.
          }}
        />
      )}
    </DashboardLayout>
  )
}
