import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  FileText, Download, Eye, Loader2, AlertCircle, Calendar,
  Battery, MapPin, Clock, Wrench, Filter, X, RefreshCw,
} from 'lucide-react'
import { getAvailableReports, downloadReport, previewReport, type ReportType, type ReportFilters } from '../../services/reportService'
import { api } from '../../lib/api'
import { SearchableSelect } from '../../components/ui/searchable-select'

interface StationOption {
  _id: string
  name: string
  province?: string
}

// ── Icon Map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof FileText> = {
  Battery, MapPin, Clock, Wrench, FileText,
}

function getIcon(name: string) {
  return ICON_MAP[name] || FileText
}

// ── Color Map ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
  station_performance: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', iconBg: 'bg-violet-100' },
  daily_station:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', iconBg: 'bg-orange-100' },
  inventory_status:    { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200', iconBg: 'bg-teal-100' },
  maintenance_log:     { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
}

function getColors(type: string) {
  return COLOR_MAP[type] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', iconBg: 'bg-gray-100' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OperatorReports() {
  const [reports, setReports] = useState<ReportType[]>([])
  const [stations, setStations] = useState<StationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    stationId: '',
  })

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [list, stationList] = await Promise.all([
        getAvailableReports(),
        api.get<StationOption[]>('/stations').catch(() => []),
      ])
      setReports(list)
      setStations(Array.isArray(stationList) ? stationList : [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const validateReport = (type: string) => {
    if (type === 'inventory_status' && !filters.stationId) {
      window.alert('Please select a Station ID in the filters first.')
      return false
    }
    return true
  }

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

  const clearFilters = () => setFilters({ startDate: '', endDate: '', stationId: '' })
  const hasActiveFilters = Object.values(filters).some((v) => v)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              Station Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate reports for your station operations
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
            </Button>
            <Button variant="outline" size="sm" onClick={fetchReports} className="gap-2">
              <RefreshCw className="w-4 h-4" />
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
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date Range
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 gap-1">
                    <X className="w-3 h-3" /> Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Start Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">End Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Station</Label>
                  <SearchableSelect
                    value={filters.stationId || ''}
                    onChange={(val) => setFilters((f) => ({ ...f, stationId: val }))}
                    options={stations.map((s) => ({ value: s._id, label: s.name, subLabel: s.province }))}
                    placeholder="All Stations"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Loading available reports…</p>
          </div>
        )}

        {/* Report Cards */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reports.map((report) => {
              const Icon = getIcon(report.icon)
              const colors = getColors(report.type)
              const isGenerating = generating === report.type
              const isPreviewing = previewing === report.type
              const isBusy = isGenerating || isPreviewing

              return (
                <Card
                  key={report.type}
                  className={`group border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${colors.border}`}
                >
                  <div className={`h-1 ${colors.bg.replace('50', '400')}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm">{report.label}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(report.type)}
                        disabled={isBusy}
                        className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs h-8"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                        ) : (
                          <><Download className="w-3.5 h-3.5" /> Download PDF</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(report.type)}
                        disabled={isBusy}
                        className="gap-1.5 text-xs h-8"
                      >
                        {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && reports.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No reports available</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
