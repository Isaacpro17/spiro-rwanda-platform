/**
 * @file PendingTransactionModal.tsx
 * @description Rider-side modal for confirming PIN-gated operator transactions.
 * Polls for a pending transaction every 5 seconds and shows a PIN-entry modal when found.
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Clock, CreditCard, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { PendingTransaction } from '../types'

const POLL_INTERVAL = 5_000

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PendingTransactionModal() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const T = t.rider.pendingTransaction

  const [tx, setTx] = useState<PendingTransaction | null>(null)
  const [pin, setPin] = useState(['', '', '', ''])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ title: string; desc: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Poll for pending transaction
  useEffect(() => {
    if (!user || user.role !== 'rider') return

    const poll = async () => {
      try {
        const found: PendingTransaction | null = await api.get<any>('/riders/transactions/pending') ?? null
        if (found && found._id !== tx?._id) {
          setTx(found)
          setDismissed(false)
          setPin(['', '', '', ''])
          setError('')
          setSuccess(null)
        } else if (!found && tx) {
          // Transaction disappeared (completed/expired by someone else) — close
          setTx(null)
        }
      } catch {
        // silently ignore network errors — don't interrupt the rider's UX
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (!tx) return
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(tx.expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tx])

  if (!tx || dismissed || success === null && tx.status !== 'pending') return null
  if (dismissed) return null

  const isExpired = timeLeft <= 0

  const typeLabel = () => {
    if (tx.type === 'wallet_topup') return T.typeTopup
    if (tx.type === 'subscription') return T.typeSubscription
    return T.typeSwap
  }

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...pin]
    next[index] = value.slice(-1)
    setPin(next)
    setError('')
    if (value && index < 3) pinRefs[index + 1].current?.focus()
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus()
    }
  }

  const handleConfirm = async () => {
    const pinStr = pin.join('')
    if (pinStr.length !== 4) {
      setError(T.errInvalidPin)
      return
    }
    setConfirming(true)
    setError('')
    try {
      const result = await api.post<any>(`/riders/transactions/${tx._id}/confirm`, { pin: pinStr })
      let desc = ''
      if (tx.type === 'wallet_topup') {
        desc = T.successTopup.replace('{{amount}}', Number(tx.amountRwf).toLocaleString())
      } else if (tx.type === 'subscription') {
        const planName = typeof tx.planId === 'object' && tx.planId ? tx.planId.name : 'Subscription'
        desc = T.successSubscription.replace('{{plan}}', planName)
      } else {
        desc = T.successSwap.replace('{{amount}}', Number(tx.amountRwf).toLocaleString())
      }
      void result // satisfy TS
      setSuccess({ title: T.successTitle, desc })
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Confirmation failed'
      setError(msg)
    } finally {
      setConfirming(false)
    }
  }

  const handleClose = () => {
    setTx(null)
    setSuccess(null)
    setDismissed(true)
    setPin(['', '', '', ''])
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-900">{T.modalTitle}</span>
          </div>
          <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            // ── Success state ────────────────────────────────────────────────
            <div className="text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-success mx-auto" />
              <p className="text-lg font-semibold text-gray-900">{success.title}</p>
              <p className="text-sm text-gray-600">{success.desc}</p>
              <button
                onClick={handleClose}
                className="mt-2 w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {T.successClose}
              </button>
            </div>
          ) : (
            // ── PIN entry state ──────────────────────────────────────────────
            <>
              <div>
                <p className="text-sm text-gray-600 mb-3">{T.modalDesc}</p>
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">{typeLabel()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-primary">RWF {Number(tx.amountRwf).toLocaleString()}</span>
                  </div>
                  {tx.type === 'subscription' && tx.planId && typeof tx.planId === 'object' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-medium text-gray-900">{tx.planId.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {isExpired ? (
                <div className="text-center py-4">
                  <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{T.expired}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {T.pinLabel}
                    </label>
                    <div className="flex gap-3 justify-center">
                      {pin.map((digit, i) => (
                        <input
                          key={i}
                          ref={pinRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(i, e)}
                          className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl border-gray-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                      ))}
                    </div>
                    {error && <p className="text-xs text-error mt-2 text-center">{error}</p>}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{T.expiresIn} {formatTime(timeLeft)}</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleConfirm}
                      disabled={confirming || pin.join('').length !== 4}
                      className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {confirming ? T.confirming : T.confirm}
                    </button>
                    <button
                      onClick={() => setDismissed(true)}
                      className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {T.dismiss}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
