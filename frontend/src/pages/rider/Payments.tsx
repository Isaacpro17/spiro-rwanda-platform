import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  CreditCard, Smartphone, TrendingUp, AlertCircle,
  CheckCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Download, XCircle, FileText,
} from 'lucide-react'
import { downloadReport } from '../../services/reportService'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { PaymentRecord, RiderProfileData } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRwf(n: number): string {
  return 'RWF ' + Number(n).toLocaleString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function providerLabel(p: string): string {
  return p === 'mtn_momo' ? 'MTN MoMo' : p === 'airtel_money' ? 'Airtel Money' : 'Cash'
}

// ── Status badge variant ──────────────────────────────────────────────────────
function statusVariant(status: string): 'success' | 'destructive' | 'default' {
  return status === 'success' ? 'success' : status === 'failed' ? 'destructive' : 'default'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TxSkeleton() {
  return (
    <div className="flex items-center justify-between py-3.5 border-b last:border-0 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-200 rounded-full" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3.5 w-20 bg-gray-200 rounded" />
        <div className="h-3 w-14 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// ── Page Component ─────────────────────────────────────────────────────────────

export function Payments() {
  const { t } = useLanguage()
  const p = t.rider.payments

  const txTypeLabel = (type: string) =>
    type === 'wallet_topup' ? p.typeTopup
    : type === 'subscription' ? p.typeSubscription
    : p.typeSwap

  const txStatusLabel = (status: string) =>
    status === 'success' ? p.statusSuccess
    : status === 'failed' ? p.statusFailed
    : p.statusPending

  // ── Wallet balance ──
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  // ── Transaction history ──
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // ── Top-up form ──
  const [topupForm, setTopupForm] = useState({
    provider: 'mtn_momo' as 'mtn_momo' | 'airtel_money',
    amount: '',
    phone: '',
  })
  const [isTopping, setIsTopping] = useState(false)
  const [topupError, setTopupError] = useState<string | null>(null)
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null)

  // ── Invoice ──
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null)

  // ── Fetch wallet balance ──────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const data = await api.get<RiderProfileData>('/riders/profile')
      setWalletBalance(data.profile?.walletBalance ?? 0)
    } catch {
      setWalletBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // ── Fetch payment history ─────────────────────────────────────────────────
  const fetchHistory = useCallback(async (p: number) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await api.get<{ payments: PaymentRecord[]; total: number; pages: number }>(
        `/payments/history?page=${p}`
      )
      setPayments(data.payments ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.pages ?? 1)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { fetchBalance() }, [fetchBalance])
  useEffect(() => { fetchHistory(page) }, [fetchHistory, page])

  // ── Top-up submit ─────────────────────────────────────────────────────────
  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    setTopupError(null)
    setTopupSuccess(null)

    const amount = parseFloat(topupForm.amount)
    if (!topupForm.amount || isNaN(amount) || amount < 100) {
      setTopupError('Minimum top-up amount is RWF 100')
      return
    }
    if (!topupForm.phone.trim()) {
      setTopupError('Phone number is required')
      return
    }

    setIsTopping(true)
    try {
      const result = await api.post<{ newWalletBalance: number; transactionId: string }>(
        '/payments/topup',
        {
          provider: topupForm.provider,
          amountRwf: amount,
          senderPhone: topupForm.phone.trim(),
        }
      )
      setWalletBalance(result.newWalletBalance)
      setTopupSuccess(`RWF ${amount.toLocaleString()} added successfully!`)
      setTopupForm((f) => ({ ...f, amount: '', phone: '' }))
      fetchHistory(1)
      setPage(1)
    } catch (err: any) {
      setTopupError(err.response?.data?.message || 'Failed to process top-up. Please try again.')
    } finally {
      setIsTopping(false)
    }
  }

  // ── Invoice download ──────────────────────────────────────────────────────
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
      // silently ignore invoice errors
    } finally {
      setInvoiceLoading(null)
    }
  }

  const refresh = () => { fetchBalance(); fetchHistory(page) }

  const [downloadingReport, setDownloadingReport] = useState(false)
  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true)
      await downloadReport('payment_statement')
    } catch (err: any) {
      console.error('Failed to download report', err)
    } finally {
      setDownloadingReport(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{p.title}</h1>
            <p className="text-gray-600 mt-1">{p.subtitle}</p>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="gap-2 h-auto py-1.5 px-3 mr-2"
            >
              {downloadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Download PDF
            </Button>
            <button
              onClick={refresh}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Refresh payments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left column: Balance + Top-up ── */}
          <div className="space-y-6">

            {/* Wallet Balance Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">{p.currentBalance}</p>
                  {balanceLoading ? (
                    <div className="h-10 w-40 bg-gray-200 rounded animate-pulse mx-auto" />
                  ) : (
                    <p className="text-4xl font-bold text-primary">
                      {walletBalance !== null ? formatRwf(walletBalance) : '—'}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{p.rwandanFranc}</p>
                </div>
              </CardContent>
            </Card>

            {/* Top-up Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{p.addFunds}</CardTitle>
              </CardHeader>
              <CardContent>
                {topupSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg text-sm mb-4">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{topupSuccess}</span>
                  </div>
                )}
                {topupError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm mb-4">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{topupError}</span>
                  </div>
                )}

                <form onSubmit={handleTopup} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label>{p.amountLabel}</Label>
                    <Input
                      type="number"
                      placeholder={p.amountPlaceholder}
                      min={100}
                      step={100}
                      value={topupForm.amount}
                      onChange={(e) => setTopupForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                    {/* Quick amounts */}
                    <div className="flex gap-2 flex-wrap">
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupForm((f) => ({ ...f, amount: String(amt) }))}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            topupForm.amount === String(amt)
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-200 text-gray-600 hover:border-primary/50'
                          }`}
                        >
                          {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{p.phoneLabel}</Label>
                    <Input
                      type="tel"
                      placeholder={p.phonePlaceholder}
                      value={topupForm.phone}
                      onChange={(e) => setTopupForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{p.paymentMethod}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTopupForm((f) => ({ ...f, provider: 'mtn_momo' }))}
                        className={`flex items-center gap-2 p-3 border rounded-lg text-sm font-medium transition-colors ${
                          topupForm.provider === 'mtn_momo'
                            ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopupForm((f) => ({ ...f, provider: 'airtel_money' }))}
                        className={`flex items-center gap-2 p-3 border rounded-lg text-sm font-medium transition-colors ${
                          topupForm.provider === 'airtel_money'
                            ? 'border-red-400 bg-red-50 text-red-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        Airtel Money
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isTopping}>
                    {isTopping ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{p.processing}</>
                    ) : (
                      <><TrendingUp className="w-4 h-4 mr-2" />{p.addFundsBtn}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Transaction History ── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>{p.transactionHistory}</CardTitle>
                {!historyLoading && total > 0 && (
                  <span className="text-xs text-gray-400 font-normal">
                    {total !== 1
                      ? p.transactions.replace('{n}', String(total))
                      : p.transaction.replace('{n}', String(total))}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">

                {historyError && (
                  <div className="flex items-center gap-3 p-4 mx-6 mb-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{historyError}</span>
                    <Button variant="ghost" size="sm" onClick={() => fetchHistory(page)} className="ml-auto text-error">
                      {p.retry}
                    </Button>
                  </div>
                )}

                {historyLoading ? (
                  <div className="px-6">
                    {[1, 2, 3, 4, 5].map((i) => <TxSkeleton key={i} />)}
                  </div>
                ) : !historyError && payments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-7 h-7 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{p.noTransactions}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.noTransactionsDesc}</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-6">
                    {payments.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between py-3.5 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === 'wallet_topup' ? 'bg-success/10' :
                            tx.type === 'subscription' ? 'bg-warning/10' : 'bg-primary/10'
                          }`}>
                            <CreditCard className={`w-4.5 h-4.5 ${
                              tx.type === 'wallet_topup' ? 'text-success' :
                              tx.type === 'subscription' ? 'text-warning' : 'text-primary'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {txTypeLabel(tx.type)} — {providerLabel(tx.provider)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDate(tx.createdAt)} · {tx.transactionId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${tx.type === 'wallet_topup' ? 'text-success' : 'text-gray-900'}`}>
                              {tx.type === 'wallet_topup' ? '+' : '-'}{formatRwf(tx.amountRwf)}
                            </p>
                            <Badge variant={statusVariant(tx.status)} className="text-xs mt-0.5">
                              {txStatusLabel(tx.status)}
                            </Badge>
                          </div>
                          {tx.status === 'success' && (
                            <button
                              type="button"
                              onClick={() => handleInvoice(tx._id)}
                              disabled={invoiceLoading === tx._id}
                              className="p-1.5 text-gray-400 hover:text-primary rounded-md hover:bg-primary/5 transition-colors"
                              aria-label="Download invoice"
                            >
                              {invoiceLoading === tx._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 pt-4 pb-4 border-t">
                    <span className="text-xs text-gray-500">{p.pageOf.replace('{n}', String(page)).replace('{total}', String(totalPages))}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || historyLoading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || historyLoading}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
