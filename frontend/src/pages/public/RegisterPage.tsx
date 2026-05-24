import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Bike,
  Wrench,
  Building2,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Car,
} from 'lucide-react'

type Role = 'rider' | 'operator' | 'technician'

const ROLES: { value: Role; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  {
    value: 'rider',
    label: 'Rider',
    desc: 'I swap batteries and ride an electric motorcycle',
    icon: Bike,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    value: 'operator',
    label: 'Station Operator',
    desc: 'I manage a battery swap station',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    value: 'technician',
    label: 'Technician',
    desc: 'I maintain and repair batteries',
    icon: Wrench,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
]

export function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | ''>('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    nid: '',
    password: '',
    confirmPassword: '',
    language: 'en',
    // rider-specific fields
    vehicleRegistration: '',
    motorcycleModel: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  /* ── NID validation: exactly 16 digits ── */
  const nidValid = /^\d{16}$/.test(form.nid)

  /* ── Password strength ── */
  const passwordChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*]/.test(form.password),
  }
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!role) { setError('Please select your role'); return }
    if (!nidValid) { setError('National ID must be exactly 16 digits'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (passwordStrength < 3) { setError('Please use a stronger password'); return }

    setIsLoading(true)
    try {
      const payload: Record<string, string> = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        nid: form.nid,
        password: form.password,
        role,
        language: form.language,
      }

      // Rider-specific fields
      if (role === 'rider') {
        payload.vehicleRegistration = form.vehicleRegistration
        payload.motorcycleModel = form.motorcycleModel
      }

      const result = await api.post<{ userId: string; otpSent: boolean }>('/auth/register', payload)
      navigate('/verify-otp', { state: { userId: result.userId, phone: form.phone } })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-800 flex items-center justify-center p-4 py-12">
      {/* Top-left: Back navigation */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium group"
          aria-label="Go back"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </span>
          <span className="hidden sm:block">Back</span>
        </button>
      </div>

      <div className="absolute top-4 right-4">
        <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
          <Globe className="w-4 h-4" /> English
        </button>
      </div>

      <div className="w-full max-w-lg mt-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? 'bg-accent-500 text-primary' : 'bg-white/20 text-white/60'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-white' : 'text-white/50'}`}>
                {s === 1 ? 'Choose Role' : 'Your Details'}
              </span>
              {s < 2 && <div className={`w-8 h-0.5 ${step > s ? 'bg-accent-500' : 'bg-white/20'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Who are you?' : 'Create Your Account'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1
                ? 'Select your role to get started with Spiro'
                : 'Fill in your details to join the platform'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {/* ── Step 1: Role Selection ── */}
          {step === 1 && (
            <div className="space-y-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    role === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 ${r.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <r.icon className={`w-6 h-6 ${r.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{r.label}</div>
                    <div className="text-sm text-gray-500">{r.desc}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      role === r.value ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}
                  >
                    {role === r.value && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}

              <Button
                type="button"
                onClick={() => {
                  if (!role) { setError('Please select your role'); return }
                  setError('')
                  setStep(2)
                }}
                className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold mt-4"
              >
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <p className="text-center text-sm text-gray-600 pt-2">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">
                  Log in
                </Link>
              </p>
            </div>
          )}

          {/* ── Step 2: Details Form ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected role badge */}
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                {(() => {
                  const r = ROLES.find((r) => r.value === role)!
                  return (
                    <>
                      <div className={`w-8 h-8 ${r.bg} rounded-lg flex items-center justify-center`}>
                        <r.icon className={`w-4 h-4 ${r.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Registering as: <strong>{r.label}</strong></span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="ml-auto text-xs text-primary hover:underline"
                      >
                        Change
                      </button>
                    </>
                  )
                })()}
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="fullName" type="text" placeholder="Jean Pierre Nkurunziza"
                    value={form.fullName} onChange={set('fullName')} className="pl-10" required />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="phone" type="tel" placeholder="+250 7XX XXX XXX"
                    value={form.phone} onChange={set('phone')} className="pl-10" required />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="email" type="email" placeholder="you@example.com"
                    value={form.email} onChange={set('email')} className="pl-10" required />
                </div>
              </div>

              {/* National ID Number */}
              <div className="space-y-1">
                <Label htmlFor="nid">National ID Number (NID)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="nid"
                    type="text"
                    placeholder="16-digit national identification number"
                    value={form.nid}
                    onChange={(e) => {
                      // Only allow digits, max 16
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                      setForm((f) => ({ ...f, nid: val }))
                    }}
                    className={`pl-10 ${form.nid && !nidValid ? 'border-red-300' : form.nid && nidValid ? 'border-green-400' : ''}`}
                    maxLength={16}
                    inputMode="numeric"
                    required
                  />
                </div>
                {form.nid && (
                  <p className={`text-xs mt-1 ${nidValid ? 'text-green-600' : 'text-red-500'}`}>
                    {nidValid ? '✓ Valid NID format' : `${form.nid.length}/16 digits entered`}
                  </p>
                )}
              </div>

              {/* Rider-specific fields */}
              {role === 'rider' && (
                <div className="space-y-4 pt-2 pb-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Motorcycle Details</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {/* Motorcycle Model */}
                  <div className="space-y-1">
                    <Label htmlFor="motorcycleModel">Motorcycle Model</Label>
                    <div className="relative">
                      <Bike className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="motorcycleModel"
                        type="text"
                        placeholder="e.g. Spiro Electric"
                        value={form.motorcycleModel}
                        onChange={set('motorcycleModel')}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {/* Vehicle Registration */}
                  <div className="space-y-1">
                    <Label htmlFor="vehicleRegistration">Vehicle Registration Number</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="vehicleRegistration"
                        type="text"
                        placeholder="e.g. RAD 123 A"
                        value={form.vehicleRegistration}
                        onChange={set('vehicleRegistration')}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="password" type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                    value={form.password} onChange={set('password')} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          passwordStrength >= i
                            ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-yellow-400' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                            : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className={passwordChecks.length ? 'text-green-600' : ''}>✓ 8+ chars</span>
                      <span className={passwordChecks.upper ? 'text-green-600' : ''}>✓ Uppercase</span>
                      <span className={passwordChecks.number ? 'text-green-600' : ''}>✓ Number</span>
                      <span className={passwordChecks.special ? 'text-green-600' : ''}>✓ Symbol</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={form.confirmPassword} onChange={set('confirmPassword')}
                    className={`pl-10 pr-10 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300' : ''}`}
                    required />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold"
                disabled={isLoading}>
                {isLoading ? 'Creating Account…' : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">Log in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
