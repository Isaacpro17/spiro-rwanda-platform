import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  CreditCard, Gift, Download, Trash2, Loader2,
  AlertTriangle, Eye, EyeOff, CheckCircle, XCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { RiderProfileData } from '../../types'

// ── Toast-style notification ──────────────────────────────────────────────────

type Notification = { type: 'success' | 'error'; message: string } | null

function Alert({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  if (!notification) return null
  const isSuccess = notification.type === 'success'
  return (
    <div
      className={`flex items-center justify-between border px-4 py-3 rounded-lg text-sm mb-4 ${
        isSuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {isSuccess
          ? <CheckCircle className="w-4 h-4 shrink-0" />
          : <XCircle className="w-4 h-4 shrink-0" />
        }
        <span>{notification.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-4 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

// ── Delete Account Modal ──────────────────────────────────────────────────────

function DeleteAccountModal({ onClose, onConfirm, isDeleting }: {
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  const { t } = useLanguage()
  const m = t.rider.profile.deleteModal
  const [confirmText, setConfirmText] = useState('')
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>
          <div>
            <h2 id="delete-account-title" className="text-lg font-bold text-gray-900">{m.title}</h2>
            <p className="text-sm text-gray-500">{m.subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700">{m.body}</p>

        <div className="space-y-2">
          <Label htmlFor="confirm-delete">{m.confirmLabel}</Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={m.confirmPlaceholder}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isDeleting}>
            {m.cancel}
          </Button>
          <Button
            type="button"
            className="flex-1 bg-error hover:bg-error/90"
            disabled={confirmText !== 'DELETE' || isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{m.deleting}</> : m.deleteBtn}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export function RiderProfile() {
  const { updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const pr = t.rider.profile

  // ── Profile state ──
  const [loading, setLoading]               = useState(true)
  const [profileNotif, setProfileNotif]     = useState<Notification>(null)
  const [savingProfile, setSavingProfile]   = useState(false)
  const [walletBalance, setWalletBalance]   = useState<number | null>(null)
  const [loyaltyPoints, setLoyaltyPoints]   = useState<number>(0)

  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '', nid: '',
    vehicleRegistration: '', motorcycleModel: '',
  })

  // ── Password state ──
  const [passNotif, setPassNotif]   = useState<Notification>(null)
  const [savingPass, setSavingPass] = useState(false)
  const [passwords, setPasswords]   = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false })

  // ── Data export state ──
  const [exporting, setExporting] = useState(false)

  // ── Delete account state ──
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting]           = useState(false)

  // ── Fetch profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.get<RiderProfileData>('/riders/profile')
        setProfile({
          fullName:            data.user.fullName       ?? '',
          email:               data.user.email          ?? '',
          phone:               data.user.phone          ?? '',
          nid:                 data.user.nid             ?? '',
          vehicleRegistration: data.profile?.vehicleRegistration ?? '',
          motorcycleModel:     data.profile?.motorcycleModel     ?? '',
        })
        setWalletBalance(data.profile?.walletBalance  ?? null)
        setLoyaltyPoints(data.profile?.loyaltyPoints  ?? 0)
      } catch {
        setProfileNotif({ type: 'error', message: 'Failed to load profile data.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileNotif(null)
    setSavingProfile(true)
    try {
      const result = await api.put<RiderProfileData>('/riders/profile', {
        fullName:            profile.fullName,
        email:               profile.email,
        phone:               profile.phone,
        nid:                 profile.nid,
        vehicleRegistration: profile.vehicleRegistration,
        motorcycleModel:     profile.motorcycleModel,
      })
      updateUser(result.user)
      setProfileNotif({ type: 'success', message: 'Profile saved successfully.' })
    } catch (err: any) {
      setProfileNotif({ type: 'error', message: err.response?.data?.message || 'Failed to save profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassNotif(null)

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassNotif({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    if (passwords.newPassword.length < 8) {
      setPassNotif({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }

    setSavingPass(true)
    try {
      await api.put('/riders/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
        confirmPassword: passwords.confirmPassword,
      })
      setPassNotif({ type: 'success', message: 'Password updated successfully.' })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setPassNotif({ type: 'error', message: err.response?.data?.message || 'Failed to update password.' })
    } finally {
      setSavingPass(false)
    }
  }

  // ── Data export ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.get<Record<string, unknown>>('/riders/data-export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spiro-data-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setProfileNotif({ type: 'error', message: 'Failed to export data. Please try again.' })
    } finally {
      setExporting(false)
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await api.delete('/riders/account')
      logout()
      navigate('/login')
    } catch {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setProfileNotif({ type: 'error', message: 'Failed to delete account. Please try again.' })
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{pr.title}</h1>
          <p className="text-gray-600 mt-1">{pr.subtitle}</p>
        </div>

        {/* ── Account summary strip ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{pr.walletBalance}</p>
                  <p className="text-base font-bold text-gray-900">
                    {walletBalance !== null ? 'RWF ' + walletBalance.toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{pr.loyaltyPoints}</p>
                  <p className="text-base font-bold text-gray-900">{loyaltyPoints.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Personal Information ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{pr.personalInfo}</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert notification={profileNotif} onDismiss={() => setProfileNotif(null)} />
                <form className="space-y-6" onSubmit={handleProfileSave} noValidate>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{pr.fullName}</Label>
                      <Input id="fullName" value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{pr.email}</Label>
                      <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{pr.phone}</Label>
                      <Input id="phone" type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nid">{pr.nid}</Label>
                      <Input
                        id="nid"
                        value={profile.nid}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                          setProfile((p) => ({ ...p, nid: val }))
                        }}
                        maxLength={16}
                        inputMode="numeric"
                        placeholder={pr.nidPlaceholder}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="motorcycleModel">{pr.motorcycleModel}</Label>
                      <Input id="motorcycleModel" value={profile.motorcycleModel} onChange={(e) => setProfile((p) => ({ ...p, motorcycleModel: e.target.value }))} placeholder={pr.motorcyclePlaceholder} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleRegistration">{pr.registrationNumber}</Label>
                      <Input id="vehicleRegistration" value={profile.vehicleRegistration} onChange={(e) => setProfile((p) => ({ ...p, vehicleRegistration: e.target.value }))} placeholder={pr.registrationPlaceholder} />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{pr.saving}</> : pr.saveChanges}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── Account Actions ── */}
            <Card>
              <CardHeader>
                <CardTitle>{pr.account}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pr.exportMyData}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.exportDesc}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                    {exporting ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{pr.exporting}</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-1.5" />{pr.export}</>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-error">{pr.deleteAccount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.deleteDesc}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-error/50 text-error hover:bg-error/5 hover:border-error"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {pr.delete}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Change Password ── */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{pr.changePassword}</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert notification={passNotif} onDismiss={() => setPassNotif(null)} />
                <form className="space-y-4" onSubmit={handlePasswordSave} noValidate>

                  {(['current', 'new', 'confirm'] as const).map((field) => {
                    const fieldMap = {
                      current: { id: 'currentPassword', label: pr.currentPassword, placeholder: pr.currentPasswordPlaceholder },
                      new:     { id: 'newPassword',     label: pr.newPassword,     placeholder: pr.newPasswordPlaceholder },
                      confirm: { id: 'confirmPassword', label: pr.confirmNewPassword, placeholder: pr.confirmPasswordPlaceholder },
                    }
                    const meta = fieldMap[field]
                    const key = field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword'
                    const hasError = field === 'confirm' && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword

                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={meta.id}>{meta.label}</Label>
                        <div className="relative">
                          <Input
                            id={meta.id}
                            type={showPwd[field] ? 'text' : 'password'}
                            value={passwords[key]}
                            onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                            className={`pr-10 ${hasError ? 'border-red-300' : ''}`}
                            required
                            placeholder={meta.placeholder}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, [field]: !s[field] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label={showPwd[field] ? 'Hide' : 'Show'}
                          >
                            {showPwd[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {hasError && (
                          <p className="text-xs text-red-500">{pr.passwordsNoMatch}</p>
                        )}
                      </div>
                    )
                  })}

                  <Button type="submit" className="w-full" disabled={savingPass}>
                    {savingPass ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{pr.updating}</> : pr.updatePassword}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeleting}
        />
      )}
    </DashboardLayout>
  )
}
