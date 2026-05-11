import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Lock, Globe, Phone } from 'lucide-react'
import { SpiroLogo } from '../../components/ui/SpiroLogo'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const loggedInUser = await login(phone, password)
      // Navigate to the correct dashboard based on server-assigned role
      const dashboards: Record<string, string> = {
        rider: '/rider/dashboard',
        operator: '/operator/dashboard',
        technician: '/technician/dashboard',
        admin: '/admin/dashboard',
      }
      navigate(dashboards[loggedInUser.role] ?? '/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link to="/">
          <SpiroLogo size="sm" />
        </Link>
      </div>

      <div className="absolute top-4 right-4">
        <button className="flex items-center space-x-2 text-white hover:text-accent-500 transition-colors">
          <Globe className="w-5 h-5" />
          <span>English</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SpiroLogo size="xl" className="drop-shadow-2xl" />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Login
            </h1>
            {/* <p className="text-gray-600">
              At Spiro, we are dedicated to enhancing livelihoods through sustainable energy by
              leading the large-scale electrification of mobility across Africa.
            </p> */}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>


            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-accent-500" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:text-primary-600 font-medium">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary-600 font-medium">
                Sign up
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-white text-sm">
          <Link to="/about" className="hover:text-accent-500 transition-colors">About Us</Link>
          <span className="mx-2">•</span>
          <Link to="/services" className="hover:text-accent-500 transition-colors">Services</Link>
          <span className="mx-2">•</span>
          <Link to="/contact" className="hover:text-accent-500 transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
