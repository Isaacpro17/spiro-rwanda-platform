import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
  }).format(amount)
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function getBatteryStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    available: 'text-success bg-success/10',
    charging: 'text-warning bg-warning/10',
    'in-use': 'text-primary bg-primary/10',
    maintenance: 'text-error bg-error/10',
    faulty: 'text-error bg-error/10',
  }
  return statusColors[status] || 'text-gray-500 bg-gray-100'
}

export function getStatusBadgeColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'bg-success text-white',
    pending: 'bg-warning text-white',
    completed: 'bg-primary text-white',
    cancelled: 'bg-error text-white',
    failed: 'bg-error text-white',
  }
  return statusColors[status] || 'bg-gray-500 text-white'
}
