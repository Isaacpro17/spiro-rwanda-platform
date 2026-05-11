import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { CheckCircle, RefreshCw, ArrowLeft, Eye } from 'lucide-react'
import { SpiroLogo } from '../../components/ui/SpiroLogo'

const IS_DEV = import.meta.env.DEV

export function OtpVerificationPage() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [isFetchingDevOtp, setIsFetchingDevOtp] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { userId, phone } = (location.state as { userId: string; phone: string }) || {}

  /* ── Auto-fetch OTP in dev mode ── */
  useEffect(() => {
    if (!IS_DEV || !phone) return
    const fetchDevOtp = async () => {
      setIsFetchingDevOtp(true)
      try {
        const result = await api.get<{ otp: string; expiresAt: string }>(
          `/auth/dev/otp?phone=${encodeURIComponent(phone)}`
        )
        setDevOtp(result.otp)
      } catch {
        // OTP not ready yet or already used — silently ignore
      } finally {
        setIsFetchingDevOtp(false)
      }
    }
    // Small delay to let the backend finish writing the OTP to MongoDB
    const t = setTimeout(fetchDevOtp, 800)
    return () => clearTimeout(t)
  }, [phone])

  /* ── Auto-fill the input boxes when devOtp arrives ── */
  useEffect(() => {
    if (!devOtp) return
    const digits = devOtp.split('')
    setCode(digits)
  }, [devOtp])

  if (!userId || !phone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invalid session. Please register again.</p>
          <Link to="/register" className="text-primary font-semibold">Go to Register</Link>
        </div>
      </div>
    )
  }

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i]
    setCode(newCode)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) { setError('Please enter the full 6-digit code'); return }
    setError('')
    setIsLoading(true)

    try {
      await api.post('/auth/verify-otp', { userId, code: fullCode })
      setIsSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    setDevOtp(null)
    setCode(['', '', '', '', '', ''])
    try {
      await api.post('/auth/resend-otp', { phone })
      // Re-fetch dev OTP after resend
      if (IS_DEV) {
        setTimeout(async () => {
          try {
            const result = await api.get<{ otp: string; expiresAt: string }>(
              `/auth/dev/otp?phone=${encodeURIComponent(phone)}`
            )
            setDevOtp(result.otp)
          } catch { /* ignore */ }
        }, 800)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-800 flex items-center justify-center p-4">
      {/* Back link */}
      <div className="absolute top-4 left-4">
        <Link
          to="/register"
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Register
        </Link>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SpiroLogo size="lg" className="drop-shadow-2xl" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isSuccess ? (
            <div className="text-center py-6 animate-scale-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Verified!</h2>
              <p className="text-gray-600">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h1>
                <p className="text-gray-600 text-sm">
                  Enter the 6-digit code sent to{' '}
                  <span className="font-semibold text-primary">{phone}</span>
                </p>

                {/* Dev mode OTP display */}
                {IS_DEV && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <div className="flex items-center justify-center gap-2 text-amber-700 font-semibold mb-1">
                      <Eye className="w-4 h-4" />
                      Development Mode — OTP Preview
                    </div>
                    {isFetchingDevOtp ? (
                      <p className="text-amber-600 text-xs">Fetching OTP…</p>
                    ) : devOtp ? (
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="text-2xl font-black tracking-[0.3em] text-primary">
                          {devOtp}
                        </span>
                        <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                          ✓ Auto-filled
                        </span>
                      </div>
                    ) : (
                      <p className="text-amber-600 text-xs">
                        Could not fetch OTP — check backend console
                      </p>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* OTP Inputs */}
                <div className="flex justify-center gap-3" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                        ${digit ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-gray-50'}
                        focus:border-primary focus:bg-primary/5`}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold"
                  disabled={isLoading || code.join('').length !== 6}
                >
                  {isLoading ? 'Verifying…' : 'Verify Account'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="flex items-center gap-2 mx-auto text-sm text-gray-600 hover:text-primary transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Sending…' : "Didn't receive a code? Resend"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
