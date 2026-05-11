import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Public Pages
import { LandingPage } from './pages/public/LandingPage'
import { LoginPage } from './pages/public/LoginPage'
import { RegisterPage } from './pages/public/RegisterPage'
import { OtpVerificationPage } from './pages/public/OtpVerificationPage'
import { AboutPage } from './pages/public/AboutPage'
import { ServicesPage } from './pages/public/ServicesPage'
import { ContactPage } from './pages/public/ContactPage'

// Rider Pages
import { RiderDashboard } from './pages/rider/RiderDashboard'
import { FindStations } from './pages/rider/FindStations'
import { SwapRequest } from './pages/rider/SwapRequest'
import { SwapHistory } from './pages/rider/SwapHistory'
import { Payments } from './pages/rider/Payments'
import { Subscription } from './pages/rider/Subscription'
import { RiderProfile } from './pages/rider/RiderProfile'
import { Support } from './pages/rider/Support'

// Operator Pages
import { OperatorDashboard } from './pages/operator/OperatorDashboard'
import { Inventory } from './pages/operator/Inventory'
import { SwapProcess } from './pages/operator/SwapProcess'
import { Reservations } from './pages/operator/Reservations'
import { Maintenance } from './pages/operator/Maintenance'
import { OperatorAnalytics } from './pages/operator/OperatorAnalytics'
import { OperatorProfile } from './pages/operator/OperatorProfile'

// Technician Pages
import { TechnicianDashboard } from './pages/technician/TechnicianDashboard'
import { Tasks } from './pages/technician/Tasks'
import { Diagnostics } from './pages/technician/Diagnostics'
import { WorkHistory } from './pages/technician/WorkHistory'
import { TechnicianProfile } from './pages/technician/TechnicianProfile'

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { Users } from './pages/admin/Users'
import { Stations } from './pages/admin/Stations'
import { Batteries } from './pages/admin/Batteries'
import { Finance } from './pages/admin/Finance'
import { Analytics } from './pages/admin/Analytics'
import { Settings } from './pages/admin/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<OtpVerificationPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Rider Routes */}
            <Route
              path="/rider/dashboard"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <RiderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/stations"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <FindStations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/swap-request"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <SwapRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/swap-history"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <SwapHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/payments"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <Payments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/subscription"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/profile"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <RiderProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/support"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <Support />
                </ProtectedRoute>
              }
            />

            {/* Operator Routes */}
            <Route
              path="/operator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <OperatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/inventory"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/swap-process"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <SwapProcess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/reservations"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <Reservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/maintenance"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <Maintenance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/analytics"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <OperatorAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator/profile"
              element={
                <ProtectedRoute allowedRoles={['operator']}>
                  <OperatorProfile />
                </ProtectedRoute>
              }
            />

            {/* Technician Routes */}
            <Route
              path="/technician/dashboard"
              element={
                <ProtectedRoute allowedRoles={['technician']}>
                  <TechnicianDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technician/tasks"
              element={
                <ProtectedRoute allowedRoles={['technician']}>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technician/diagnostics"
              element={
                <ProtectedRoute allowedRoles={['technician']}>
                  <Diagnostics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technician/history"
              element={
                <ProtectedRoute allowedRoles={['technician']}>
                  <WorkHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technician/profile"
              element={
                <ProtectedRoute allowedRoles={['technician']}>
                  <TechnicianProfile />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stations"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Stations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/batteries"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Batteries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
