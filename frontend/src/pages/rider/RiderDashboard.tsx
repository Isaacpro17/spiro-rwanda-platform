import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Battery, MapPin, CreditCard, History, TrendingUp, Clock,
  Loader2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { api } from '../../lib/api'
import { stationService } from '../../services/stationService'
import type { Station } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  batteryLevel: number | null          // 0–100
  walletBalance: number | null         // RWF
  swapsThisMonth: number | null
  activePlan: string | null
  firstName: string
}

interface RecentSwapCard {
  id: string
  stationName: string
  timeAgo: string
  statusLabel: string
  status: string
}

interface NearestStationCard {
  id: string
  name: string
  distanceKm: string | null
  available: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60)    return `${diff} second${diff !== 1 ? 's' : ''} ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`
}

function formatRwf(amount: number): string {
  return 'RWF ' + Number(amount).toLocaleString()
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-16 bg-gray-200 rounded" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-3.5 w-16 bg-gray-200 rounded" />
    </div>
  )
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function loadDashboard(): Promise<{
  stats: DashboardStats
  recentSwaps: RecentSwapCard[]
  nearestStations: NearestStationCard[]
}> {
  // Profile gives us battery level, wallet balance, subscription plan & name
  const profileRes = await api.get<{
    user: { fullName: string }
    batteryLevel: number | null
    profile: {
      walletBalance?: number
      subscriptionPlanId?: { name?: string } | null
    } | null
  }>('/riders/profile')

  // Swaps this month — filter client-side from my-swaps
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const [monthSwaps, recentSwapsRaw, stationsRaw, riderLocation] = await Promise.all([
    api.get<any[]>(`/swaps/my-swaps?startDate=${startOfMonth}&status=completed`).catch(() => []),
    api.get<any[]>('/swaps/my-swaps?limit=3&status=completed').catch(() => []),
    api.get<Station[]>('/stations?status=active&limit=3').catch(() => []),
    stationService.getRiderLocation(),
  ])

  const stats: DashboardStats = {
    firstName:      profileRes.user?.fullName?.split(' ')[0] || 'Rider',
    batteryLevel:   profileRes.batteryLevel ?? null,
    walletBalance:  profileRes.profile?.walletBalance  ?? null,
    swapsThisMonth: Array.isArray(monthSwaps) ? monthSwaps.length : null,
    activePlan:     profileRes.profile?.subscriptionPlanId?.name ?? 'No Plan',
  }

  const recentSwaps: RecentSwapCard[] = (recentSwapsRaw ?? []).map((s: any) => ({
    id:          s._id,
    stationName: s.stationId?.name || 'Unknown Station',
    timeAgo:     timeAgo(s.startTime),
    status:      s.status,
    statusLabel: s.status === 'completed'   ? 'Completed'
               : s.status === 'in_progress' ? 'In Progress'
               : s.status === 'cancelled'   ? 'Cancelled'
               : s.status,
  }))

  const nearestStations: NearestStationCard[] = (stationsRaw ?? []).map((s: Station) => {
    const [lng, lat] = s.location.coordinates
    const distKm = riderLocation
      ? haversineKm(riderLocation.lat, riderLocation.lng, lat, lng).toFixed(1)
      : null
    return {
      id:          s._id,
      name:        s.name,
      distanceKm:  distKm,
      available:   s.availableBatteries,
    }
  })

  return { stats, recentSwaps, nearestStations }
}

// ── Page Component ────────────────────────────────────────────────────────────

export function RiderDashboard() {
  const [stats, setStats]                   = useState<DashboardStats | null>(null)
  const [recentSwaps, setRecentSwaps]       = useState<RecentSwapCard[]>([])
  const [nearestStations, setNearestStations] = useState<NearestStationCard[]>([])
  const [isLoading, setIsLoading]           = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { stats: s, recentSwaps: rs, nearestStations: ns } = await loadDashboard()
      setStats(s)
      setRecentSwaps(rs)
      setNearestStations(ns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const swapStatusVariant = (status: string) =>
    status === 'completed' ? 'success' : status === 'in_progress' ? 'default' : 'destructive'

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isLoading ? 'Welcome back!' : `Welcome back, ${stats?.firstName || 'Rider'}!`}
            </h1>
            <p className="text-gray-600 mt-1">Here's your activity overview</p>
          </div>
          {!isLoading && (
            <button
              onClick={load}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={load} className="ml-auto text-error hover:text-error">
              Retry
            </Button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            [1,2,3,4].map(i => <StatSkeleton key={i} />)
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Battery Level</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats?.batteryLevel != null ? `${stats.batteryLevel}%` : '—'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <Battery className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats?.walletBalance != null ? formatRwf(stats.walletBalance) : '—'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Swaps This Month</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats?.swapsThisMonth ?? '—'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent-500/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-accent-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Plan</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats?.activePlan || '—'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/rider/stations">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <MapPin className="w-6 h-6" />
                  <span>Find Station</span>
                </Button>
              </Link>
              <Link to="/rider/swap-request">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <Battery className="w-6 h-6" />
                  <span>Request Swap</span>
                </Button>
              </Link>
              <Link to="/rider/payments">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2">
                  <CreditCard className="w-6 h-6" />
                  <span>Add Funds</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Swaps */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Swaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {isLoading && [1,2,3].map(i => <RowSkeleton key={i} />)}

                {!isLoading && recentSwaps.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <History className="w-9 h-9 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No swaps yet</p>
                    <p className="text-xs text-gray-500">Your completed swaps will appear here</p>
                  </div>
                )}

                {!isLoading && recentSwaps.map((swap) => (
                  <div key={swap.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Battery className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{swap.stationName}</p>
                        <p className="text-xs text-gray-500">{swap.timeAgo}</p>
                      </div>
                    </div>
                    <Badge variant={swapStatusVariant(swap.status)} className="text-xs shrink-0">
                      {swap.statusLabel}
                    </Badge>
                  </div>
                ))}
              </div>
              <Link to="/rider/swap-history">
                <Button variant="ghost" className="w-full mt-4 text-sm">View All History</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Nearest Stations */}
          <Card>
            <CardHeader>
              <CardTitle>Nearest Stations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {isLoading && [1,2,3].map(i => <RowSkeleton key={i} />)}

                {!isLoading && nearestStations.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MapPin className="w-9 h-9 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No stations found</p>
                    <p className="text-xs text-gray-500">Check back later</p>
                  </div>
                )}

                {!isLoading && nearestStations.map((station) => (
                  <div key={station.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{station.name}</p>
                        <p className="text-xs text-gray-500">
                          {station.distanceKm ? `${station.distanceKm} km away` : 'Distance unknown'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-success shrink-0">
                      {station.available} available
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/rider/stations">
                <Button variant="ghost" className="w-full mt-4 text-sm">View All Stations</Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  )
}
