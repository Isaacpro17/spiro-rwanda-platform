export interface User {
  _id: string
  fullName: string
  email: string
  phone: string
  role: 'rider' | 'operator' | 'technician' | 'admin'
  language: 'rw' | 'en'
  isActive: boolean
  isPhoneVerified: boolean
  biometricEnrolled?: boolean
  nid?: string
  profilePicture?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface RiderProfile extends User {
  motorcycleModel?: string
  registrationNumber?: string
  batteryType?: string
  subscriptionPlan?: string
  walletBalance: number
}

export interface Station {
  _id: string
  name: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  address?: string
  province?: string
  totalSlots: number
  availableBatteries: number
  chargingBatteries: number
  lowInventoryThreshold?: number
  status: 'active' | 'inactive' | 'maintenance'
  operatorId?: string
  assignedTechnicians?: string[]
  operatingHours: {
    open: string
    close: string
  }
  stationCode?: string
  createdAt: string
  updatedAt: string
}

/** Card-ready shape produced by the station enrichment pipeline */
export interface StationCardData {
  id: string
  name: string
  address: string
  isOpen: boolean
  statusLabel: 'Open' | 'Closed'
  available: number
  distanceKm: string | null
  etaMin: number | null
  mapsUrl: string | null
  coordinates: [number, number] // [lng, lat]
}

export interface Battery {
  _id: string
  batteryId: string
  stationId: string
  chargeLevel: number
  health: number
  status: 'available' | 'charging' | 'in-use' | 'maintenance' | 'faulty'
  lastSwapTime?: string
  cycleCount: number
  temperature?: number
  voltage?: number
  createdAt: string
  updatedAt: string
}

export interface SwapTransaction {
  _id: string
  riderId: string
  stationId: string
  batteryOut: string
  batteryIn: string
  swapTime: string
  duration: number
  cost: number
  status: 'completed' | 'pending' | 'failed'
  paymentStatus: 'paid' | 'pending' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface SlotReservation {
  _id: string
  riderId: string
  stationId: string
  reservedTime: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface Payment {
  _id: string
  userId: string
  amount: number
  type: 'swap' | 'subscription' | 'wallet-topup'
  method: 'mtn-momo' | 'airtel-money' | 'cash'
  status: 'completed' | 'pending' | 'failed'
  transactionId?: string
  createdAt: string
  updatedAt: string
}

export interface MaintenanceRequest {
  _id: string
  stationId: string
  reportedBy: string
  issueType: 'battery' | 'charger' | 'equipment' | 'facility'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled'
  assignedTo?: string
  photos?: string[]
  resolution?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface SubscriptionPlan {
  _id: string
  name: string
  price: number
  duration: number // in days
  swapsIncluded: number
  features: string[]
  isActive: boolean
}

export interface SupportTicket {
  _id: string
  ticketNumber: string
  riderId: string
  subject: string
  description: string
  category: 'payment' | 'swap' | 'account' | 'other'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo?: string
  resolution?: string
  createdAt: string
  updatedAt: string
}

export interface Analytics {
  totalSwaps: number
  totalRevenue: number
  activeRiders: number
  averageWaitTime: number
  stationUtilization: number
  batteryHealth: number
  swapsByHour: Array<{ hour: number; count: number }>
  revenueByDay: Array<{ date: string; amount: number }>
  topStations: Array<{ stationId: string; name: string; swaps: number }>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface LoginCredentials {
  phone: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
export interface RiderProfileData {
  user: User
  batteryLevel: number | null
  profile: {
    _id: string
    userId: string
    vehicleRegistration?: string
    motorcycleModel?: string
    isVehicleVerified: boolean
    loyaltyPoints: number
    walletBalance: number
    subscriptionPlanId?: { _id: string; name: string; priceRwf: number; swapsPerMonth?: number } | null
    emergencyContact?: string
    createdAt: string
    updatedAt: string
  } | null
}
