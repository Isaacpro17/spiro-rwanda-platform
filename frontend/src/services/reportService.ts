import axios from 'axios'
import { api } from '../lib/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportType {
  type: string
  label: string
  description: string
  icon: string
}

export interface ReportFilters {
  startDate?: string
  endDate?: string
  stationId?: string
  status?: string
  provider?: string
  lang?: string
  riderId?: string
  technicianId?: string
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Fetches available report types for the current user's role.
 */
export async function getAvailableReports(): Promise<ReportType[]> {
  return api.get<ReportType[]>('/reports/available')
}

/**
 * Generates a PDF report and triggers browser download.
 * Uses direct axios call with responseType 'blob' to handle binary PDF data.
 */
export async function downloadReport(
  type: string,
  filters: ReportFilters = {}
): Promise<void> {
  const token = localStorage.getItem('token')

  const params = new URLSearchParams()
  params.set('type', type)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.stationId) params.set('stationId', filters.stationId)
  if (filters.status) params.set('status', filters.status)
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.lang) params.set('lang', filters.lang)
  if (filters.riderId) params.set('riderId', filters.riderId)
  if (filters.technicianId) params.set('technicianId', filters.technicianId)

  const response = await axios.get(`${API_BASE_URL}/reports/generate?${params.toString()}`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 60000, // 60 seconds for large reports
  })

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers['content-disposition']
  let filename = `spiro-report-${Date.now()}.pdf`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
    if (match?.[1]) filename = match[1]
  }

  // Create blob and trigger download
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Opens a PDF report in a new browser tab for preview.
 */
export async function previewReport(
  type: string,
  filters: ReportFilters = {}
): Promise<void> {
  const token = localStorage.getItem('token')

  const params = new URLSearchParams()
  params.set('type', type)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.stationId) params.set('stationId', filters.stationId)
  if (filters.status) params.set('status', filters.status)
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.lang) params.set('lang', filters.lang)
  if (filters.riderId) params.set('riderId', filters.riderId)
  if (filters.technicianId) params.set('technicianId', filters.technicianId)

  const response = await axios.get(`${API_BASE_URL}/reports/generate?${params.toString()}`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 60000,
  })

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // Note: we don't immediately revoke — the new tab needs the URL
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
