import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  Users, MapPin, Battery, TrendingUp, RefreshCw, AlertCircle,
  Loader2, Activity, Zap, Clock, CheckCircle2, ArrowRight, Shield, Wrench,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiReport {
  totalSwaps: number
  completedSwaps: number
  avgWaitTimeMinutes: number
  stationUtilizationRate: number
  totalRevenueRwf: number
  activeRiders: number
  totalStations: number
  totalBatteries: number
  activeBatteries: number
  chargingBatteries: number
  faultyBatteries: number
  batteryHealthPercent: number
  generatedAt: string
}

interface UserStats {
  total: number
  byRole: { rider: number; operator: number; admin: number; technician: number }
  byStatus: { active: number; inactive: number }
}

interface AuditEntry {
  _id: string
  eventType: string
  actorUserId?: string
  actorRole?: string
  resourceType?: string
  description?: string
  timestamp: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRwf(n: number) {
  if (n >= 1_000_000) return `RWF ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `RWF ${(n / 1_000).toFixed(0)}K`
  return `RWF ${n}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function eventLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, iconBg, valueColor }: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; iconBg: string; valueColor: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KpiReport | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [kpiRes, statsRes, logsRes] = await Promise.all([
        api.get<KpiReport>('/analytics/kpis'),
        api.get<UserStats>('/users/stats'),
        api.get<{ entries: AuditEntry[] }>('/audit/logs?limit=8'),
      ])
      setKpis(kpiRes as any)
      setUserStats(statsRes as any)
      setRecentLogs(((logsRes as any)?.entries ?? []) as AuditEntry[])
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const systemAlerts = []
  if (kpis) {
    if (kpis.faultyBatteries > 0) systemAlerts.push(`${kpis.faultyBatteries} faulty batteries need attention`)
    if (kpis.batteryHealthPercent < 70) systemAlerts.push('Overall battery health is below 70%')
    if (kpis.stationUtilizationRate > 90) systemAlerts.push('Station network near capacity (>90% utilization)')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.fullName?.split(' ')[0]}. Here's your system overview.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {/* System alerts */}
        {systemAlerts.length > 0 && (
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
            <p className="text-sm font-medium text-warning mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />System Alerts
            </p>
            <ul className="space-y-1">
              {systemAlerts.map((alert, i) => (
                <li key={i} className="text-sm text-warning/80 flex items-start gap-1.5">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* KPI Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : kpis ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Users"
                value={(userStats?.total ?? 0).toLocaleString()}
                sub={`${userStats?.byStatus?.active ?? 0} active`}
                icon={<Users className="w-6 h-6 text-primary" />}
                iconBg="bg-primary/10"
                valueColor="text-primary"
              />
              <KpiCard
                label="Total Stations"
                value={kpis.totalStations}
                sub={`${Math.round(kpis.stationUtilizationRate)}% utilization`}
                icon={<MapPin className="w-6 h-6 text-success" />}
                iconBg="bg-success/10"
                valueColor="text-success"
              />
              <KpiCard
                label="Total Batteries"
                value={kpis.totalBatteries}
                sub={`${kpis.faultyBatteries} faulty`}
                icon={<Battery className="w-6 h-6 text-warning" />}
                iconBg="bg-warning/10"
                valueColor="text-warning"
              />
              <KpiCard
                label="Total Revenue"
                value={fmtRwf(kpis.totalRevenueRwf)}
                sub={`${kpis.totalSwaps.toLocaleString()} total swaps`}
                icon={<TrendingUp className="w-6 h-6 text-gray-600" />}
                iconBg="bg-gray-100"
                valueColor="text-gray-900"
              />
            </div>

            {/* System health + breakdown */}
            <div className="grid lg:grid-cols-2 gap-6">

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Station Utilization', value: Math.round(kpis.stationUtilizationRate), color: kpis.stationUtilizationRate > 85 ? 'bg-warning' : 'bg-primary' },
                    { label: 'Battery Health', value: Math.round(kpis.batteryHealthPercent), color: kpis.batteryHealthPercent < 70 ? 'bg-error' : 'bg-success' },
                    { label: 'Swap Completion Rate', value: kpis.totalSwaps > 0 ? Math.round((kpis.completedSwaps / kpis.totalSwaps) * 100) : 0, color: 'bg-primary' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-semibold text-gray-900">{value}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { label: 'Avg Wait', value: `${kpis.avgWaitTimeMinutes.toFixed(1)}m`, icon: <Clock className="w-4 h-4 text-primary" /> },
                      { label: 'Active Riders', value: kpis.activeRiders, icon: <Activity className="w-4 h-4 text-success" /> },
                      { label: 'Charging', value: kpis.chargingBatteries, icon: <Zap className="w-4 h-4 text-warning" /> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="p-3 bg-gray-50 rounded-xl text-center">
                        <div className="flex justify-center mb-1">{icon}</div>
                        <p className="text-lg font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userStats && [
                    { label: 'Riders', count: userStats.byRole.rider, color: 'bg-primary', icon: <Users className="w-4 h-4 text-primary" /> },
                    { label: 'Operators', count: userStats.byRole.operator, color: 'bg-warning', icon: <Shield className="w-4 h-4 text-warning" /> },
                    { label: 'Technicians', count: userStats.byRole.technician, color: 'bg-gray-500', icon: <Wrench className="w-4 h-4 text-gray-500" /> },
                    { label: 'Admins', count: userStats.byRole.admin, color: 'bg-error', icon: <CheckCircle2 className="w-4 h-4 text-error" /> },
                  ].map(({ label, count, color, icon }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{label}</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{ width: `${userStats.total > 0 ? (count / userStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {/* Recent audit activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <button
                onClick={() => navigate('/admin/settings')}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((entry) => (
                  <div key={entry._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{eventLabel(entry.eventType)}</p>
                      {entry.description && (
                        <p className="text-xs text-gray-500 truncate">{entry.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{fmtDate(entry.timestamp)}</p>
                      <p className="text-xs text-gray-400">{fmtTime(entry.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users', icon: <Users className="w-5 h-5" />, path: '/admin/users', color: 'text-primary' },
            { label: 'Stations', icon: <MapPin className="w-5 h-5" />, path: '/admin/stations', color: 'text-success' },
            { label: 'Batteries', icon: <Battery className="w-5 h-5" />, path: '/admin/batteries', color: 'text-warning' },
            { label: 'Finance', icon: <TrendingUp className="w-5 h-5" />, path: '/admin/finance', color: 'text-gray-700' },
          ].map(({ label, icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
            >
              <div className={`${color} group-hover:scale-110 transition-transform`}>{icon}</div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">{label}</span>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>

      </div>
    </DashboardLayout>
  )
}
