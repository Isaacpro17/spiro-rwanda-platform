import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Check, Star, AlertCircle, Loader2, RefreshCw,
  CreditCard, Gift, Zap, XCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { SubscriptionPlanData, RiderProfileData } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRwf(n: number): string {
  return 'RWF ' + Number(n).toLocaleString()
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlanData
  isCurrent: boolean
  isSubscribing: boolean
  walletBalance: number
  onSubscribe: (planId: string) => void
}

function PlanCard({ plan, isCurrent, isSubscribing, walletBalance, onSubscribe }: PlanCardProps) {
  const canAfford = walletBalance >= plan.priceRwf
  const features = [
    plan.swapsPerMonth ? `${plan.swapsPerMonth} swaps/month` : 'Unlimited swaps',
    `${plan.loyaltyPointsPerSwap ?? 10} loyalty pts/swap`,
    '24/7 support access',
    'Priority station access',
  ]

  return (
    <Card className={`relative transition-all duration-200 ${isCurrent ? 'border-primary border-2 shadow-md' : 'hover:border-primary/40 hover:shadow-sm'}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> Current Plan
          </span>
        </div>
      )}
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-gray-900">{formatRwf(plan.priceRwf)}</span>
          <span className="text-gray-500 text-sm">/month</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success shrink-0" />
              <span className="text-sm text-gray-700">{f}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <Button variant="default" className="w-full" disabled>
            <Check className="w-4 h-4 mr-2" /> Active Plan
          </Button>
        ) : (
          <>
            <Button
              variant={canAfford ? 'outline' : 'outline'}
              className="w-full"
              disabled={isSubscribing || !canAfford}
              onClick={() => onSubscribe(plan._id)}
            >
              {isSubscribing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : canAfford ? (
                <><Zap className="w-4 h-4 mr-2" /> Subscribe — {formatRwf(plan.priceRwf)}</>
              ) : (
                'Insufficient Balance'
              )}
            </Button>
            {!canAfford && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Need {formatRwf(plan.priceRwf - walletBalance)} more.{' '}
                <Link to="/rider/payments" className="text-primary hover:underline">Top up wallet</Link>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page Component ─────────────────────────────────────────────────────────────

export function Subscription() {
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null)

  // ── Load plans + profile ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [plansData, profileData] = await Promise.all([
        api.get<SubscriptionPlanData[]>('/subscriptions/plans'),
        api.get<RiderProfileData>('/riders/profile'),
      ])
      setPlans(Array.isArray(plansData) ? plansData : [])
      setCurrentPlanId(profileData.profile?.subscriptionPlanId?._id ?? null)
      setWalletBalance(profileData.profile?.walletBalance ?? 0)
      setLoyaltyPoints(profileData.profile?.loyaltyPoints ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription plans')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const handleSubscribe = async (planId: string) => {
    setSubscribeError(null)
    setSubscribeSuccess(null)
    setIsSubscribing(planId)
    try {
      await api.post('/subscriptions/subscribe', { planId })
      const plan = plans.find((p) => p._id === planId)
      setCurrentPlanId(planId)
      setWalletBalance((prev) => prev - (plan?.priceRwf ?? 0))
      setSubscribeSuccess(`Successfully subscribed to ${plan?.name ?? 'plan'}!`)
    } catch (err: any) {
      setSubscribeError(err.response?.data?.message || 'Failed to subscribe. Please try again.')
    } finally {
      setIsSubscribing(null)
    }
  }

  const currentPlan = plans.find((p) => p._id === currentPlanId)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
            <p className="text-gray-600 mt-1">Choose the plan that fits your riding needs</p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label="Refresh plans"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Status banners */}
        {subscribeSuccess && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <Check className="w-4 h-4 shrink-0" />
            <span>{subscribeSuccess}</span>
          </div>
        )}
        {subscribeError && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{subscribeError}</span>
          </div>
        )}

        {/* Account summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wallet Balance</p>
                  <p className="text-base font-bold text-gray-900">
                    {isLoading ? '—' : 'RWF ' + walletBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loyalty Points</p>
                  <p className="text-base font-bold text-gray-900">
                    {isLoading ? '—' : loyaltyPoints.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Plan</p>
                  <p className="text-base font-bold text-gray-900">
                    {isLoading ? '—' : currentPlan?.name ?? 'None'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={load} className="ml-auto text-error">
              Retry
            </Button>
          </div>
        )}

        {/* Plans grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-24 bg-gray-200 rounded" />
                  <div className="h-8 w-32 bg-gray-200 rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 mb-6">
                    {[1, 2, 3, 4].map((j) => <div key={j} className="h-4 bg-gray-200 rounded" />)}
                  </div>
                  <div className="h-10 bg-gray-200 rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && plans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <Star className="w-7 h-7 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">No plans available</p>
              <p className="text-xs text-gray-500 mt-1">Check back soon for subscription options</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  isCurrent={plan._id === currentPlanId}
                  isSubscribing={isSubscribing === plan._id}
                  walletBalance={walletBalance}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>

            {/* Wallet note */}
            {walletBalance === 0 && !isLoading && (
              <div className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Your wallet is empty. <Link to="/rider/payments" className="font-semibold underline">Top up your wallet</Link> to subscribe to a plan.
                </span>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
