import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Battery, Users, TrendingUp, Clock, AlertTriangle,
  RefreshCw, MapPin, Loader2, AlertCircle, Wrench,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { StationDetail, StationStats, QueueStatus } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtRwf(n: number) {
  return 'RWF ' + Number(n).toLocaleString()
}

function statusVariant(status: string) {
  if (status === 'active') return 'success'
  if (status === 'maintenance') return 'warning'
  return 'destructive'
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  loading?: boolean
}

function KpiCard({ label, value, icon, iconBg, loading }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            {loading ? (
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            )}
          </div>
          <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OperatorDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const d = t.operator.dashboard
  const [station, setStation] = useState<StationDetail | null>(null)
  const [stats, setStats] = useState<StationStats | null>(null)
  const [queue, setQueue] = useState<QueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadQueue = useCallback(async (stationId: string) => {
    try {
      const q = await api.get<QueueStatus>(`/queue/${stationId}`)
      setQueue(q)
    } catch { /* silently ignore queue errors */ }
  }, [])

  const loadAll = useCallback(async () => {
    setError(null)
    try {
      const stations = await api.get<StationDetail[]>('/stations')
      const mine = (stations ?? []).find(
        (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
      )
      if (!mine) throw new Error('No station is assigned to your account. Contact an admin.')
      setStation(mine)

      const [statsData, queueData] = await Promise.all([
        api.get<StationStats>(`/stations/${mine._id}/stats`),
        api.get<QueueStatus>(`/queue/${mine._id}`),
      ])
      setStats(statsData)
      setQueue(queueData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    }
  }, [user?._id])

  useEffect(() => {
    setIsLoading(true)
    loadAll().finally(() => setIsLoading(false))
  }, [loadAll])

  // 30-second queue polling
  useEffect(() => {
    if (!station) return
    const id = setInterval(() => loadQueue(station._id), 30000)
    return () => clearInterval(id)
  }, [station, loadQueue])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAll()
    setIsRefreshing(false)
  }

  const lowInventory = station && station.availableBatteries <= station.lowInventoryThreshold
  const stationOffline = station?.status !== 'active'

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-gray-600 mt-1">
              {station ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {station.name}
                  {station.address && <span className="text-gray-400">— {station.address}</span>}
                </span>
              ) : d.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {station && (
              <Badge variant={statusVariant(station.status)} className="capitalize">
                {station.status}
              </Badge>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Refresh dashboard"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Alert banners */}
        {!isLoading && lowInventory && (
          <div className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {d.lowInventory} <strong>{station?.availableBatteries}</strong> {d.available}
              ({d.threshold} {station?.lowInventoryThreshold}).{' '}
            </span>
            <Link to="/operator/inventory" className="ml-auto font-semibold underline">
              {d.manageInventory}
            </Link>
          </div>
        )}

        {!isLoading && stationOffline && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{d.stationOffline} <strong>{station?.status}</strong> {d.stationOfflineSuffix}</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto text-error">
              {d.retry}
            </Button>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            label={d.kpiAvailable}
            value={isLoading ? '—' : station?.availableBatteries ?? 0}
            icon={<Battery className="w-6 h-6 text-success" />}
            iconBg="bg-success/10"
            loading={isLoading}
          />
          <KpiCard
            label={d.kpiCharging}
            value={isLoading ? '—' : station?.chargingBatteries ?? 0}
            icon={<Battery className="w-6 h-6 text-warning" />}
            iconBg="bg-warning/10"
            loading={isLoading}
          />
          <KpiCard
            label={d.kpiQueue}
            value={isLoading ? '—' : queue?.length ?? 0}
            icon={<Users className="w-6 h-6 text-primary" />}
            iconBg="bg-primary/10"
            loading={isLoading}
          />
          <KpiCard
            label={d.kpiWait}
            value={isLoading ? '—' : `${queue?.estimatedWait ?? 0} ${d.min}`}
            icon={<Clock className="w-6 h-6 text-blue-500" />}
            iconBg="bg-blue-50"
            loading={isLoading}
          />
        </div>

        {/* Today's activity */}
        <Card>
          <CardHeader>
            <CardTitle>{d.todayActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-9 w-20 bg-gray-200 rounded animate-pulse mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">{d.swapsCompleted}</p>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {stats?.todaySwaps ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{d.revenueGenerated}</p>
                  <p className="text-3xl font-bold text-success mt-2">
                    {fmtRwf(stats?.todayRevenueRwf ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{d.utilization}</p>
                  <p className="text-3xl font-bold text-warning mt-2">
                    {stats?.utilizationPercent ?? 0}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>{d.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { to: '/operator/swap-process', icon: <TrendingUp className="w-5 h-5" />, label: d.processSwap, color: 'bg-primary/10 text-primary' },
                { to: '/operator/reservations', icon: <Clock className="w-5 h-5" />, label: d.reservations, color: 'bg-blue-50 text-blue-600' },
                { to: '/operator/inventory', icon: <Battery className="w-5 h-5" />, label: d.inventory, color: 'bg-success/10 text-success' },
                { to: '/operator/maintenance', icon: <Wrench className="w-5 h-5" />, label: d.maintenance, color: 'bg-warning/10 text-warning' },
              ].map(({ to, icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color} hover:opacity-80 transition-opacity text-center`}
                >
                  {icon}
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Station info */}
        {station && (
          <Card>
            <CardHeader>
              <CardTitle>{d.stationInfo}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">{d.stationCode}</p>
                  <p className="font-mono font-medium mt-0.5">{station.stationCode ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{d.totalSlots}</p>
                  <p className="font-medium mt-0.5">{station.totalSlots}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{d.operatingHours}</p>
                  <p className="font-medium mt-0.5">
                    {station.operatingHours?.open ?? '06:00'} – {station.operatingHours?.close ?? '22:00'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{d.assignedTechnicians}</p>
                  <p className="font-medium mt-0.5">
                    {station.assignedTechnicians?.length
                      ? station.assignedTechnicians.map((tech) => tech.fullName).join(', ')
                      : d.noneAssigned}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
