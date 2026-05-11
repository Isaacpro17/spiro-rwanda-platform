import { ReactNode, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Globe,
  LayoutDashboard,
  MapPin,
  Battery,
  History,
  CreditCard,
  Settings,
  HelpCircle,
  Package,
  Users,
  BarChart3,
  Wrench,
  ClipboardList,
} from 'lucide-react'
import { Button } from '../ui/button'
import { SpiroLogo } from '../ui/SpiroLogo'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getMenuItems = () => {
    switch (user?.role) {
      case 'rider':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/rider/dashboard' },
          { icon: MapPin, label: 'Find Stations', path: '/rider/stations' },
          { icon: Battery, label: 'Request Swap', path: '/rider/swap-request' },
          { icon: History, label: 'Swap History', path: '/rider/swap-history' },
          { icon: CreditCard, label: 'Payments', path: '/rider/payments' },
          { icon: Package, label: 'Subscription', path: '/rider/subscription' },
          { icon: User, label: 'Profile', path: '/rider/profile' },
          { icon: HelpCircle, label: 'Support', path: '/rider/support' },
        ]
      case 'operator':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/operator/dashboard' },
          { icon: Battery, label: 'Inventory', path: '/operator/inventory' },
          { icon: Package, label: 'Process Swap', path: '/operator/swap-process' },
          { icon: ClipboardList, label: 'Reservations', path: '/operator/reservations' },
          { icon: Wrench, label: 'Maintenance', path: '/operator/maintenance' },
          { icon: BarChart3, label: 'Analytics', path: '/operator/analytics' },
          { icon: User, label: 'Profile', path: '/operator/profile' },
        ]
      case 'technician':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/technician/dashboard' },
          { icon: ClipboardList, label: 'Tasks', path: '/technician/tasks' },
          { icon: Battery, label: 'Diagnostics', path: '/technician/diagnostics' },
          { icon: History, label: 'Work History', path: '/technician/history' },
          { icon: User, label: 'Profile', path: '/technician/profile' },
        ]
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: MapPin, label: 'Stations', path: '/admin/stations' },
          { icon: Battery, label: 'Batteries', path: '/admin/batteries' },
          { icon: CreditCard, label: 'Finance', path: '/admin/finance' },
          { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-gray-500 hover:text-gray-700 lg:hidden"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="ml-4 lg:ml-0">
                <SpiroLogo size="xs" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <Globe className="w-5 h-5" />
              </button>
              <button className="text-gray-500 hover:text-gray-700 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.fullName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } pt-16`}
      >
        <nav className="h-full overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-error hover:text-error hover:bg-error/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
