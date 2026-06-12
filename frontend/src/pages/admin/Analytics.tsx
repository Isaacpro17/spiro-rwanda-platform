import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  TrendingUp, Users, MapPin, Battery, Clock, Activity,
  AlertCircle, Loader2, RefreshCw, Zap, Download,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from '../../lib/api'

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

interface AnalyticsReport {
  swapsByDay?: Array<{ date: string; swaps: number; revenue: number }>
  stationBreakdown?: Array<{
    stationId: string
    name: string
    totalSwaps: number
    avgWaitTimeMinutes: number
    revenueRwf: number
  }>
  batteryHealth?: { healthy: number; degraded: number; faulty: number }
  swapsByHour?: Array<{ hour: number; count: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRwf(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, iconBg, valueColor }: {
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
          <div className={`w-11 h-11 ${iconBg} rounded-full flex items-center justify-center`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Analytics() {
  const [kpis, setKpis] = useState<KpiReport | null>(null)
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [kpiRes, reportRes] = await Promise.all([
        api.get<KpiReport>('/analytics/kpis'),
        api.get<AnalyticsReport>('/analytics/report').catch(() => ({} as AnalyticsReport)),
      ])
      setKpis(kpiRes as any)
      setReport(reportRes as any)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.get('/analytics/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spiro-analytics-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail export
    } finally {
      setExporting(false)
    }
  }

  // Build chart data from KPIs if report data is sparse
  const batteryPieData = kpis ? [
    { name: 'Active', value: kpis.activeBatteries },
    { name: 'Charging', value: kpis.chargingBatteries },
    { name: 'Faulty', value: kpis.faultyBatteries },
  ].filter((d) => d.value > 0) : []

  const swapsByDay = report?.swapsByDay ?? []
  const stationBreakdown = (report?.stationBreakdown ?? []).slice(0, 10)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">System-wide performance metrics and trends</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Export
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : kpis ? (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Swaps"
                value={kpis.totalSwaps.toLocaleString()}
                sub={`${kpis.completedSwaps.toLocaleString()} completed`}
                icon={<Zap className="w-5 h-5 text-primary" />}
                iconBg="bg-primary/10"
                valueColor="text-primary"
              />
              <MetricCard
                label="Total Revenue"
                value={`RWF ${fmtRwf(kpis.totalRevenueRwf)}`}
                icon={<TrendingUp className="w-5 h-5 text-success" />}
                iconBg="bg-success/10"
                valueColor="text-success"
              />
              <MetricCard
                label="Active Riders"
                value={kpis.activeRiders.toLocaleString()}
                icon={<Users className="w-5 h-5 text-gray-600" />}
                iconBg="bg-gray-100"
                valueColor="text-gray-900"
              />
              <MetricCard
                label="Avg Wait Time"
                value={`${kpis.avgWaitTimeMinutes.toFixed(1)} min`}
                icon={<Clock className="w-5 h-5 text-warning" />}
                iconBg="bg-warning/10"
                valueColor="text-warning"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Stations"
                value={kpis.totalStations}
                sub={`${Math.round(kpis.stationUtilizationRate)}% utilization`}
                icon={<MapPin className="w-5 h-5 text-success" />}
                iconBg="bg-success/10"
                valueColor="text-success"
              />
              <MetricCard
                label="Total Batteries"
                value={kpis.totalBatteries}
                sub={`${kpis.faultyBatteries} faulty`}
                icon={<Battery className="w-5 h-5 text-warning" />}
                iconBg="bg-warning/10"
                valueColor="text-warning"
              />
              <MetricCard
                label="Battery Health"
                value={`${Math.round(kpis.batteryHealthPercent)}%`}
                icon={<Activity className="w-5 h-5 text-primary" />}
                iconBg="bg-primary/10"
                valueColor={kpis.batteryHealthPercent < 70 ? 'text-error' : 'text-primary'}
              />
              <MetricCard
                label="Completion Rate"
                value={`${kpis.totalSwaps > 0 ? Math.round((kpis.completedSwaps / kpis.totalSwaps) * 100) : 0}%`}
                icon={<Zap className="w-5 h-5 text-success" />}
                iconBg="bg-success/10"
                valueColor="text-success"
              />
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-2 gap-6">

              {/* Swaps by day */}
              {swapsByDay.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Swaps Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={swapsByDay} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => String(v ?? '')} />
                        <Line type="monotone" dataKey="swaps" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Battery status breakdown */}
              {batteryPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Battery Fleet Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={batteryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {batteryPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: unknown) => String(v ?? '')} />
                        <Legend iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Fallback: system health bars when no time-series data */}
              {swapsByDay.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Health Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={[
                          { name: 'Utilization', value: Math.round(kpis.stationUtilizationRate) },
                          { name: 'Batt. Health', value: Math.round(kpis.batteryHealthPercent) },
                          { name: 'Completion', value: kpis.totalSwaps > 0 ? Math.round((kpis.completedSwaps / kpis.totalSwaps) * 100) : 0 },
                        ]}
                        margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v: unknown) => `${v ?? 0}%`} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Station breakdown table */}
            {stationBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Stations by Swaps</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Swaps</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Wait</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stationBreakdown.map((s, i) => (
                          <tr key={s.stationId ?? i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{s.name ?? s.stationId?.slice(-8)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{(s.totalSwaps ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-success font-medium">RWF {fmtRwf(s.revenueRwf ?? 0)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{(s.avgWaitTimeMinutes ?? 0).toFixed(1)} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {kpis.generatedAt && (
              <p className="text-xs text-gray-400 text-center">
                Data generated at {new Date(kpis.generatedAt).toLocaleString()}
              </p>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
