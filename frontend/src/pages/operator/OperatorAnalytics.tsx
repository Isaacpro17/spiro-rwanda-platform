import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  AlertCircle, RefreshCw, Loader2, TrendingUp, Clock,
  Wrench, DollarSign, Download,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { StationDetail, StationBreakdown, DailyStat } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtRwf(n: number) {
  return 'RWF ' + Number(n).toLocaleString()
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Quick date presets ────────────────────────────────────────────────────────

function buildPreset(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OperatorAnalytics() {
  const { user } = useAuth()
  const [station, setStation] = useState<StationDetail | null>(null)
  const [breakdown, setBreakdown] = useState<StationBreakdown | null>(null)
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [startDate, setStartDate] = useState(isoDate(new Date(Date.now() - 6 * 86400000)))
  const [endDate, setEndDate] = useState(isoDate(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadStation = useCallback(async () => {
    const stations = await api.get<StationDetail[]>('/stations')
    return (stations ?? []).find(
      (s) => (s.operatorId as any)?._id === user?._id || s.operatorId === (user?._id as any)
    ) ?? null
  }, [user?._id])

  const loadAnalytics = useCallback(async (s: StationDetail, start: string, end: string) => {
    const params = new URLSearchParams({ startDate: start, endDate: end })
    const diffDays = Math.max(1, Math.min(30, Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    ) + 1))

    const [breakdownData, dailyData] = await Promise.all([
      api.get<StationBreakdown>(`/analytics/stations/${s._id}?${params}`),
      api.get<DailyStat[]>(`/analytics/stations/${s._id}/daily?days=${diffDays}`),
    ])
    setBreakdown(breakdownData)
    setDaily(dailyData ?? [])
  }, [])

  const initialLoad = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const s = await loadStation()
      if (!s) throw new Error('No station assigned to your account')
      setStation(s)
      await loadAnalytics(s, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [loadStation, loadAnalytics, startDate, endDate])

  useEffect(() => { initialLoad() }, [initialLoad])

  const applyDateRange = () => {
    if (!station) return
    setIsLoading(true)
    loadAnalytics(station, startDate, endDate).finally(() => setIsLoading(false))
  }

  const setPreset = (days: number) => {
    const { startDate: s, endDate: e } = buildPreset(days)
    setStartDate(s)
    setEndDate(e)
    if (!station) return
    setIsLoading(true)
    loadAnalytics(station, s, e).finally(() => setIsLoading(false))
  }

  const handleExport = async () => {
    if (!station) return
    setExporting(true)
    try {
      const data = await api.get<Record<string, unknown>>(
        `/analytics/export?stationId=${station._id}&startDate=${startDate}&endDate=${endDate}&format=json`
      )
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${station.stationCode ?? station._id}-${startDate}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    finally { setExporting(false) }
  }

  // Chart data with readable labels
  const chartData = daily.map((d) => ({
    date: shortDate(d.date),
    swaps: d.swaps,
    revenue: Math.round(d.revenueRwf / 1000), // show in K
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Station Analytics</h1>
            <p className="text-gray-600 mt-1">
              {station ? `${station.name} — performance metrics and insights` : 'Performance metrics and insights'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !station}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Export
            </Button>
            <button
              onClick={initialLoad}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={initialLoad} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        {/* Date range filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
              </div>
              <Button size="sm" onClick={applyDateRange} disabled={isLoading}>Apply</Button>
              <div className="flex gap-1.5 ml-auto">
                {[
                  { label: 'Today', days: 1 },
                  { label: '7 days', days: 7 },
                  { label: '30 days', days: 30 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => setPreset(days)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-5 pb-5">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-8 w-16 bg-gray-200 rounded mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Swaps"
              value={breakdown?.totalSwaps ?? 0}
              icon={<TrendingUp className="w-5 h-5" />}
              sub={`${startDate} to ${endDate}`}
            />
            <KpiCard
              label="Total Revenue"
              value={fmtRwf(breakdown?.revenueRwf ?? 0)}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <KpiCard
              label="Avg Wait Time"
              value={`${breakdown?.avgWaitTimeMinutes ?? 0} min`}
              icon={<Clock className="w-5 h-5" />}
            />
            <KpiCard
              label="Maintenance Issues"
              value={breakdown?.maintenanceIncidents ?? 0}
              icon={<Wrench className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Daily chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Swap Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p className="text-sm">No data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="K" />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      name === 'revenue' ? `RWF ${(Number(value) * 1000).toLocaleString()}` : String(value ?? ''),
                      name === 'revenue' ? 'Revenue' : 'Swaps',
                    ] as [string, string]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar yAxisId="left" dataKey="swaps" name="Swaps" fill="var(--color-primary, #3b82f6)" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue (RWF K)" fill="var(--color-success, #22c55e)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Station battery health */}
        {station && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Current Battery Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">{station.availableBatteries}</p>
                  <p className="text-sm text-gray-600 mt-1">Available</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-warning">{station.chargingBatteries}</p>
                  <p className="text-sm text-gray-600 mt-1">Charging</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{station.totalSlots}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Slots</p>
                </div>
              </div>
              {/* Fill-level bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Station fill level</span>
                  <span>{station.totalSlots > 0 ? Math.round(((station.availableBatteries + station.chargingBatteries) / station.totalSlots) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${station.totalSlots > 0 ? Math.round(((station.availableBatteries + station.chargingBatteries) / station.totalSlots) * 100) : 0}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
