import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { RiderProfileData } from '../../types'

// ── Toast-style notification ─────────────────────────────────────────────────
type Notification = { type: 'success' | 'error'; message: string } | null

function Alert({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  if (!notification) return null
  const colors =
    notification.type === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700'
  return (
    <div className={`flex items-center justify-between border px-4 py-3 rounded-lg text-sm mb-4 ${colors}`} role="alert">
      <span>{notification.message}</span>
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

// ── Main Profile Page ─────────────────────────────────────────────────────────
export function RiderProfile() {
  const { updateUser } = useAuth()

  // ── Profile state ──
  const [loading, setLoading]           = useState(true)
  const [profileNotif, setProfileNotif] = useState<Notification>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profile, setProfile] = useState<{
    fullName: string
    email:    string
    phone:    string
    nid:      string
    vehicleRegistration: string
    motorcycleModel:     string
  }>({
    fullName:            '',
    email:               '',
    phone:               '',
    nid:                 '',
    vehicleRegistration: '',
    motorcycleModel:     '',
  })

  // ── Password state ──
  const [passNotif, setPassNotif]     = useState<Notification>(null)
  const [savingPass, setSavingPass]   = useState(false)
  const [passwords, setPasswords] = useState({
    currentPassword:  '',
    newPassword:      '',
    confirmPassword:  '',
  })
  const [showPwd, setShowPwd] = useState({
    current: false,
    new:     false,
    confirm: false,
  })

  // ── Fetch profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.get<RiderProfileData>('/riders/profile')
        setProfile({
          fullName:            data.user.fullName ?? '',
          email:               data.user.email    ?? '',
          phone:               data.user.phone    ?? '',
          nid:                 data.user.nid      ?? '',
          vehicleRegistration: data.profile?.vehicleRegistration ?? '',
          motorcycleModel:     data.profile?.motorcycleModel     ?? '',
        })
      } catch {
        setProfileNotif({ type: 'error', message: 'Failed to load profile data.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Save profile changes ───────────────────────────────────────────────────
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
      // Sync auth context with updated user data
      updateUser(result.user)
      setProfileNotif({ type: 'success', message: 'Profile saved successfully.' })
    } catch (err: any) {
      setProfileNotif({ type: 'error', message: err.response?.data?.message || 'Failed to save profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassNotif(null)

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassNotif({ type: 'error', message: 'New password and confirm password do not match.' })
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
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Personal Information ── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert notification={profileNotif} onDismiss={() => setProfileNotif(null)} />
                <form className="space-y-6" onSubmit={handleProfileSave} noValidate>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profile.fullName}
                        onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nid">ID Number (NID)</Label>
                      <Input
                        id="nid"
                        value={profile.nid}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                          setProfile((p) => ({ ...p, nid: val }))
                        }}
                        maxLength={16}
                        inputMode="numeric"
                        placeholder="16-digit national ID"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="motorcycleModel">Motorcycle Model</Label>
                      <Input
                        id="motorcycleModel"
                        value={profile.motorcycleModel}
                        onChange={(e) => setProfile((p) => ({ ...p, motorcycleModel: e.target.value }))}
                        placeholder="e.g. Spiro Electric"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleRegistration">Registration Number</Label>
                      <Input
                        id="vehicleRegistration"
                        value={profile.vehicleRegistration}
                        onChange={(e) => setProfile((p) => ({ ...p, vehicleRegistration: e.target.value }))}
                        placeholder="e.g. RAD 123 A"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* ── Change Password ── */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert notification={passNotif} onDismiss={() => setPassNotif(null)} />
                <form className="space-y-4" onSubmit={handlePasswordSave} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPwd.current ? 'text' : 'password'}
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                        className="pr-10"
                        required
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xs"
                        aria-label={showPwd.current ? 'Hide password' : 'Show password'}
                      >
                        {showPwd.current ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPwd.new ? 'text' : 'password'}
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                        className="pr-10"
                        required
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, new: !s.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xs"
                        aria-label={showPwd.new ? 'Hide password' : 'Show password'}
                      >
                        {showPwd.new ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPwd.confirm ? 'text' : 'password'}
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                        className={`pr-10 ${
                          passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword
                            ? 'border-red-300'
                            : ''
                        }`}
                        required
                        placeholder="Repeat new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xs"
                        aria-label={showPwd.confirm ? 'Hide password' : 'Show password'}
                      >
                        {showPwd.confirm ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={savingPass}>
                    {savingPass ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
