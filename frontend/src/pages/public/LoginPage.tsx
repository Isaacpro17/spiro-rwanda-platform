import { useState } from 'react'
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Lock, Globe, Phone, Home, Eye, EyeOff } from 'lucide-react'
import { SpiroLogo } from '../../components/ui/SpiroLogo'
import { useLanguage } from '../../contexts/LanguageContext'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, lang, toggle } = useLanguage()
  const l = t.auth.login

  // If already authenticated, redirect to user's dashboard (prevents URL bypass)
  if (!authLoading && isAuthenticated && user) {
    const dashboards: Record<string, string> = {
      rider:      '/rider/dashboard',
      operator:   '/operator/dashboard',
      technician: '/technician/dashboard',
      admin:      '/admin/dashboard',
    }
    return <Navigate to={dashboards[user.role] ?? '/'} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const loggedInUser = await login(phone, password)
      const from = (location.state as any)?.from?.pathname
      const dashboards: Record<string, string> = {
        rider:      '/rider/dashboard',
        operator:   '/operator/dashboard',
        technician: '/technician/dashboard',
        admin:      '/admin/dashboard',
      }
      navigate(from ?? dashboards[loggedInUser.role] ?? '/')
    } catch (err: any) {
      setError(err.response?.data?.message || l.errorCredentials)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-800 flex items-center justify-center p-4">
      {/* Top-left: Home navigation indicator */}
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium group"
          aria-label="Return to home page"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
            <Home className="w-4 h-4" />
          </span>
          <span className="hidden sm:block">{l.home}</span>
        </Link>
      </div>

      <div className="absolute top-4 right-4">
        <button
          onClick={toggle}
          className="flex items-center space-x-2 text-white hover:text-accent-500 transition-colors"
        >
          <Globe className="w-5 h-5" />
          <span>{lang === 'en' ? l.langRw : l.langEn}</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SpiroLogo size="xl" className="drop-shadow-2xl" />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">{l.phoneLabel}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder={l.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{l.passwordLabel}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={l.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-accent-500" />
                <span className="text-gray-600">{l.rememberMe}</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:text-primary-600 font-medium">
                {l.forgotPassword}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? l.loggingIn : l.loginBtn}
            </Button>

            <div className="text-center text-sm text-gray-600">
              {l.noAccount}{' '}
              <Link to="/register" className="text-primary hover:text-primary-600 font-medium">
                {l.signUp}
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-white text-sm">
          <Link to="/about" className="hover:text-accent-500 transition-colors">{l.aboutUs}</Link>
          <span className="mx-2">•</span>
          <Link to="/services" className="hover:text-accent-500 transition-colors">{l.services}</Link>
          <span className="mx-2">•</span>
          <Link to="/contact" className="hover:text-accent-500 transition-colors">{l.contactUs}</Link>
        </div>
      </div>
    </div>
  )
}
