import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { SearchableSelect } from '../../components/ui/searchable-select'
import {
  FileText, Download, Eye, Loader2, AlertCircle, Calendar,
  Zap, TrendingUp, Battery, MapPin, Users, Shield,
  Clock, Wrench, Filter, X, RefreshCw,
} from 'lucide-react'
import {
  getAvailableReports,
  downloadReport,
  previewReport,
  type ReportType,
  type ReportFilters,
} from '../../services/reportService'
import { api } from '../../lib/api'

// ── Icon Map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof FileText> = {
  Zap, TrendingUp, Battery, MapPin, Users, Shield, Clock, Wrench, DollarSign: TrendingUp, FileText,
}

function getIcon(name: string) {
  return ICON_MAP[name] || FileText
}

// ── Color Map for Report Cards ────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  swap_operations:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200', iconBg: 'bg-blue-100' },
  financial:           { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
  battery_health:      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', iconBg: 'bg-amber-100' },
  station_performance: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', iconBg: 'bg-violet-100' },
  user_activity:       { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200', iconBg: 'bg-cyan-100' },
  audit_trail:         { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200', iconBg: 'bg-rose-100' },
  daily_station:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', iconBg: 'bg-orange-100' },
  inventory_status:    { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200', iconBg: 'bg-teal-100' },
  maintenance_log:     { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
  swap_history:        { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200', iconBg: 'bg-sky-100' },
  payment_statement:   { bg: 'bg-lime-50',   text: 'text-lime-700',   border: 'border-lime-200', iconBg: 'bg-lime-100' },
  work_history:        { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', iconBg: 'bg-fuchsia-100' },
}

function getColors(type: string) {
  return COLOR_MAP[type] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', iconBg: 'bg-gray-100' }
}

// ── Station Type ──────────────────────────────────────────────────────────────

interface StationOption {
  _id: string
  name: string
  province?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminReports() {
  const [reports, setReports] = useState<ReportType[]>([])
  const [stations, setStations] = useState<StationOption[]>([])
  const [riders, setRiders] = useState<{ _id: string; fullName: string; phone: string }[]>([])
  const [technicians, setTechnicians] = useState<{ _id: string; fullName: string; phone: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    stationId: '',
    status: '',
    provider: '',
    riderId: '',
    technicianId: '',
  })

  // Fetch available reports and stations
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [reportList, stationList, riderRes, techRes] = await Promise.all([
        getAvailableReports(),
        api.get<StationOption[]>('/stations').catch(() => []),
        api.get<{ users: any[] }>('/users?role=rider&limit=1000').catch(() => ({ users: [] })),
        api.get<{ users: any[] }>('/users?role=technician&limit=1000').catch(() => ({ users: [] })),
      ])
      setReports(reportList)
      setStations(Array.isArray(stationList) ? stationList : [])
      setRiders(riderRes.users || [])
      setTechnicians(techRes.users || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const validateReport = (type: string) => {
    if ((type === 'payment_statement' || type === 'swap_history') && !filters.riderId) {
      window.alert('Please select a Rider ID in the filters first.')
      return false
    }
    if (type === 'work_history' && !filters.technicianId) {
      window.alert('Please select a Technician ID in the filters first.')
      return false
    }
    if (type === 'inventory_status' && !filters.stationId) {
      window.alert('Please select a Station ID in the filters first.')
      return false
    }
    return true
  }

  // Generate PDF
  const handleDownload = async (type: string) => {
    if (!validateReport(type)) return;
    try {
      setGenerating(type)
      setError('')
      await downloadReport(type, filters)
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          setError(json.message || 'Failed to generate report')
          return
        } catch { /* ignore */ }
      }
      setError(err?.response?.data?.message || err.message || 'Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  // Preview PDF
  const handlePreview = async (type: string) => {
    if (!validateReport(type)) return;
    try {
      setPreviewing(type)
      setError('')
      await previewReport(type, filters)
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          setError(json.message || 'Failed to preview report')
          return
        } catch { /* ignore */ }
      }
      setError(err?.response?.data?.message || err.message || 'Failed to preview report')
    } finally {
      setPreviewing(null)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', stationId: '', status: '', provider: '', riderId: '', technicianId: '' })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v)

  // Check if a report type needs station filter
  const needsStationFilter = (type: string) =>
    ['station_performance', 'daily_station', 'inventory_status'].includes(type)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate and download PDF reports for your operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="default" className="ml-1 bg-primary text-white text-xs px-1.5 py-0">
                  {Object.values(filters).filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  Report Filters
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 gap-1">
                    <X className="w-3 h-3" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Date Range */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                {/* Station Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Station</Label>
                  <SearchableSelect
                    value={filters.stationId || ''}
                    onChange={(val) => setFilters((f) => ({ ...f, stationId: val }))}
                    options={stations.map((s) => ({ value: s._id, label: s.name, subLabel: s.province }))}
                    placeholder="All Stations"
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Status</Label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Provider Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Provider</Label>
                  <select
                    value={filters.provider || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                  >
                    <option value="">All Providers</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                {/* Rider ID Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Rider</Label>
                  <SearchableSelect
                    value={filters.riderId || ''}
                    onChange={(val) => setFilters((f) => ({ ...f, riderId: val }))}
                    options={riders.map((r) => ({ value: r._id, label: r.fullName, subLabel: r.phone }))}
                    placeholder="Select Rider"
                  />
                </div>

                {/* Technician ID Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Technician</Label>
                  <SearchableSelect
                    value={filters.technicianId || ''}
                    onChange={(val) => setFilters((f) => ({ ...f, technicianId: val }))}
                    options={technicians.map((t) => ({ value: t._id, label: t.fullName, subLabel: t.phone }))}
                    placeholder="Select Technician"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Loading available reports…</p>
          </div>
        )}

        {/* Report Cards Grid */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {reports.map((report) => {
              const Icon = getIcon(report.icon)
              const colors = getColors(report.type)
              const isGenerating = generating === report.type
              const isPreviewing = previewing === report.type
              const isBusy = isGenerating || isPreviewing

              return (
                <Card
                  key={report.type}
                  className={`group relative overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${colors.border}`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 ${colors.bg.replace('50', '400')}`} />

                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {report.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                    </div>

                    {/* Station hint for station-scoped reports */}
                    {needsStationFilter(report.type) && !filters.stationId && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md">
                        <MapPin className="w-3 h-3" />
                        <span>Select a station in filters for best results</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(report.type)}
                        disabled={isBusy}
                        className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs h-8"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(report.type)}
                        disabled={isBusy}
                        className="gap-1.5 text-xs h-8"
                      >
                        {isPreviewing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No reports available</p>
            <p className="text-xs mt-1">Contact your administrator for access.</p>
          </div>
        )}

        {/* Info Footer */}
        {!loading && reports.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
            <FileText className="w-4 h-4 shrink-0" />
            <span>
              Reports default to the last 30 days when no date range is selected. Maximum 5,000 records per report.
              All report generations are logged in the audit trail.
            </span>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
