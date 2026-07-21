/**
 * @file WalletTopup.tsx
 * @description Operator Payment Hub — 3 tabs for PIN-gated cash transactions:
 *   1. Wallet Top-up  2. Grant Subscription  3. Buy Swap
 */

import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle,
  Clock,
  CreditCard,
  Search,
  User,
  XCircle,
  Loader2,
  Wallet,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../lib/api'
import type { SubscriptionPlanData } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'topup' | 'subscription' | 'swap'

interface RiderLookup {
  _id: string
  fullName: string
  phone: string
  walletBalance: number
}

interface PinState {
  transactionId: string
  pin: string
  expiresAt: string
  amountRwf: number
  riderName: string
  type: Tab
  planName?: string
}

type Phase = 'setup' | 'pending' | 'completed' | 'cancelled_tx' | 'expired_tx'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function tabToType(tab: Tab): string {
  if (tab === 'topup') return 'wallet_topup'
  if (tab === 'subscription') return 'subscription'
  return 'swap_cost'
}

// ─────────────────────────────────────────────────────────────────────────────
export function WalletTopup() {
  const { t } = useLanguage()
  const T = t.operator.walletTopup

  const [activeTab, setActiveTab] = useState<Tab>('topup')
  const [phase, setPhase] = useState<Phase>('setup')

  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [rider, setRider] = useState<RiderLookup | null>(null)
  const [riderError, setRiderError] = useState('')

  const [amount, setAmount] = useState('')
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const [pinState, setPinState] = useState<PinState | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  // On mount: recover any pending transaction the operator left behind
  useEffect(() => {
    api.get<any>('/operators/transactions/my-pending').then((tx) => {
      if (!tx) return
      const typeMap: Record<string, Tab> = { wallet_topup: 'topup', subscription: 'subscription', swap_cost: 'swap' }
      const rider = tx.riderId as { fullName: string; phone: string }
      setPinState({
        transactionId: tx._id,
        pin: '****',           // PIN is not recoverable — shown as masked
        expiresAt: tx.expiresAt,
        amountRwf: tx.amountRwf,
        riderName: rider?.fullName ?? 'Unknown',
        type: typeMap[tx.type] ?? 'topup',
        planName: tx.planId?.name,
      })
      setPhase('pending')
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'subscription' || plans.length > 0) return
    setPlansLoading(true)
    api.get<any>('/subscriptions/plans')
      .then((r) => setPlans((Array.isArray(r) ? r : []).filter((p: SubscriptionPlanData) => p.isActive)))
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (phase !== 'pending' || !pinState) return
    const tick = () => {
      const rem = Math.max(0, Math.floor((new Date(pinState.expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(rem)
      if (rem === 0) { setPhase('expired_tx'); clearAll() }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return clearAll
  }, [phase, pinState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll status
  useEffect(() => {
    if (phase !== 'pending' || !pinState) return
    const poll = async () => {
      try {
        const res = await api.get<any>(`/operators/transactions/${pinState.transactionId}`)
        const status: string = res?.status
        if (status === 'completed') { setPhase('completed'); clearAll() }
        else if (status === 'cancelled' || status === 'expired') { setPhase('cancelled_tx'); clearAll() }
      } catch { /* ignore */ }
    }
    pollRef.current = setInterval(poll, 3_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!phone.trim()) { setRiderError(T.errPhone); return }
    setSearching(true); setRiderError(''); setRider(null)
    try {
      const found = await api.get<any>(`/operators/rider-lookup?phone=${encodeURIComponent(phone.trim())}`)
      if (!found) { setRiderError(T.errNotFound); return }
      setRider(found)
    } catch (err: any) {
      setRiderError(err?.response?.data?.message || T.errNotFound)
    } finally { setSearching(false) }
  }

  const handleSend = async () => {
    if (!rider) return
    setSendError(''); setSending(true)
    const body: Record<string, unknown> = { riderId: rider._id, type: tabToType(activeTab) }

    if (activeTab === 'subscription') {
      if (!selectedPlanId) { setSendError('Please select a plan'); setSending(false); return }
      body.planId = selectedPlanId
    } else {
      const amt = parseFloat(amount)
      if (!amount || isNaN(amt) || amt < 100 || amt > 500_000) {
        setSendError(T.errAmount); setSending(false); return
      }
      body.amountRwf = amt
    }

    try {
      const data = await api.post<any>('/operators/transactions/initiate', body)
      const selectedPlan = plans.find((p) => p._id === selectedPlanId)
      setPinState({
        transactionId: data.transactionId,
        pin: data.pin,
        expiresAt: data.expiresAt,
        amountRwf: data.amountRwf,
        riderName: data.riderName || rider.fullName,
        type: activeTab,
        planName: selectedPlan?.name,
      })
      setPhase('pending')
    } catch (err: any) {
      setSendError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to initiate')
    } finally { setSending(false) }
  }

  const handleCancel = async () => {
    if (!pinState) return
    setCancelling(true)
    try {
      await api.delete(`/operators/transactions/${pinState.transactionId}`)
      setPhase('cancelled_tx'); clearAll()
    } catch (err: any) {
      setSendError(err?.response?.data?.message || 'Failed to cancel')
    } finally { setCancelling(false) }
  }

  const handleReset = () => {
    clearAll(); setPhase('setup'); setPinState(null)
    setRider(null); setPhone(''); setAmount(''); setSelectedPlanId('')
    setSendError(''); setRiderError('')
  }

  const sendBtnLabel = () => {
    if (activeTab === 'topup') return T.sendTopup
    if (activeTab === 'subscription') return T.sendSubscription
    return T.sendSwap
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'topup', label: T.tabTopup, icon: Wallet },
    { key: 'subscription', label: T.tabSubscription, icon: BadgeCheck },
    { key: 'swap', label: T.tabSwap, icon: CreditCard },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{T.subtitle}</p>
        </div>

        {/* Tabs */}
        {phase === 'setup' && (
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setRider(null); setRiderError(''); setSendError('') }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── SETUP ─────────────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            {/* Rider search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{T.lookupTitle}</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={T.phonePlaceholder}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {searching ? T.searching : T.searchBtn}
                </button>
              </div>
              {riderError && <p className="text-xs text-error mt-1">{riderError}</p>}
            </div>

            {/* Rider card */}
            {rider && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{rider.fullName}</p>
                  <p className="text-xs text-gray-500">{rider.phone}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">{T.currentBalance}</p>
                  <p className="text-sm font-bold text-gray-900">RWF {Number(rider.walletBalance ?? 0).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Tab-specific form */}
            {rider && (
              <>
                {activeTab !== 'subscription' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{T.amountLabel}</label>
                    <input
                      type="number"
                      min={100}
                      max={500_000}
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setSendError('') }}
                      placeholder={T.amountPlaceholder}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1">{T.amountHint}</p>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{T.selectPlan}</label>
                    {plansLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                      </div>
                    ) : plans.length === 0 ? (
                      <p className="text-sm text-gray-400">{T.noPlans}</p>
                    ) : (
                      <select
                        value={selectedPlanId}
                        onChange={(e) => { setSelectedPlanId(e.target.value); setSendError('') }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="">{T.selectPlan}</option>
                        {plans.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} — RWF {Number(p.priceRwf).toLocaleString()}
                            {p.swapsPerMonth ? ` (${p.swapsPerMonth} swaps/mo)` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {sendError && <p className="text-xs text-error">{sendError}</p>}

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {sending ? T.sending : sendBtnLabel()}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PENDING — show PIN ────────────────────────────────────────── */}
        {phase === 'pending' && pinState && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <p className="font-semibold text-gray-900">{T.pinTitle}</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">{T.pinInstructions}</p>
            </div>

            {/* PIN digits */}
            {pinState.pin === '****' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                <p className="text-sm font-medium text-amber-800">PIN already shared with rider</p>
                <p className="text-xs text-amber-600 mt-0.5">The PIN was shown when the transaction was created. Ask the rider to check their app, or cancel and start a new transaction.</p>
              </div>
            ) : (
              <div className="flex justify-center gap-3">
                {pinState.pin.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 flex items-center justify-center text-3xl font-extrabold bg-primary/5 border-2 border-primary rounded-xl text-primary select-all"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            )}

            {/* Transaction details */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{T.riderLabel}</span>
                <span className="font-medium text-gray-900">{pinState.riderName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{T.amountLabelDisplay}</span>
                <span className="font-semibold text-primary">RWF {Number(pinState.amountRwf).toLocaleString()}</span>
              </div>
              {pinState.planName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{T.planLabel}</span>
                  <span className="font-medium text-gray-900">{pinState.planName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{T.expiresIn} {formatTime(timeLeft)}</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {T.pinWaiting}
            </div>

            {sendError && <p className="text-xs text-error text-center">{sendError}</p>}

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-2.5 border border-error text-error text-sm font-medium rounded-lg hover:bg-error/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
              {cancelling ? T.cancelling : T.cancelBtn}
            </button>
          </div>
        )}

        {/* ── COMPLETED ────────────────────────────────────────────────── */}
        {phase === 'completed' && pinState && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <div>
              <p className="text-xl font-bold text-gray-900">{T.pinCompleted}</p>
              <p className="text-sm text-gray-500 mt-1">
                {pinState.riderName} — RWF {Number(pinState.amountRwf).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {T.newTransaction}
            </button>
          </div>
        )}

        {/* ── CANCELLED / EXPIRED ──────────────────────────────────────── */}
        {(phase === 'cancelled_tx' || phase === 'expired_tx') && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <XCircle className="w-16 h-16 text-gray-300 mx-auto" />
            <div>
              <p className="text-xl font-bold text-gray-900">
                {phase === 'expired_tx' ? T.pinExpired : T.pinCancelled}
              </p>
              <p className="text-sm text-gray-500 mt-1">Transaction did not complete.</p>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {T.newTransaction}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
