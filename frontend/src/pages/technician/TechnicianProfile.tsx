import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  User, Phone, Mail, Globe, Eye, EyeOff, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, MapPin, Shield,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { User as UserType, StationDetail } from '../../types'

// ── Page ──────────────────────────────────────────────────────────────────────

export function TechnicianProfile() {
  const { user, updateUser } = useAuth()
  const [stations, setStations] = useState<StationDetail[]>([])

  // Profile form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<'rw' | 'en'>('rw')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoadError(null)
    setIsLoading(true)
    try {
      const [meData, stationsData] = await Promise.all([
        api.get<{ user: UserType }>('/auth/me'),
        api.get<StationDetail[]>('/technicians/my-stations'),
      ])
      const me = (meData as any)?.user ?? meData
      setFullName(me.fullName ?? '')
      setPhone(me.phone ?? '')
      setEmail(me.email ?? '')
      setLanguage(((me.language) as 'rw' | 'en') ?? 'rw')
      setStations(stationsData ?? [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Pre-fill from auth context while loading
  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.fullName)
      setPhone((prev) => prev || user.phone)
      setEmail((prev) => prev || user.email)
      setLanguage(user.language ?? 'rw')
    }
  }, [user])

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileSuccess('')
    setProfileError('')
    try {
      const result = await api.put<{ user: UserType }>('/auth/me', { fullName, phone, email, language })
      const updated = (result as any)?.user ?? result
      updateUser(updated as UserType)
      setProfileSuccess('Profile updated successfully.')
      setTimeout(() => setProfileSuccess(''), 4000)
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    setPasswordSaving(true)
    setPasswordSuccess('')
    setPasswordError('')
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword })
      setPasswordSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your account settings</p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadError && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
            <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-error">Retry</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Profile info */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm text-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-lg text-sm text-error">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{profileError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />Phone Number
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 ..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />Preferred Language
                </Label>
                <div className="flex gap-2">
                  {(['en', 'rw'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        language === lang
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {lang === 'en' ? 'English' : 'Kinyarwanda'}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleProfileSave} disabled={profileSaving} className="w-full mt-2">
                {profileSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                ) : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Password change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm text-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-lg text-sm text-error">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{passwordError}</span>
                </div>
              )}

              {[
                { id: 'cur-pass', label: 'Current Password', value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: setShowCurrent },
                { id: 'new-pass', label: 'New Password', value: newPassword, setter: setNewPassword, show: showNew, toggle: setShowNew },
                { id: 'confirm-pass', label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: setShowConfirm },
              ].map(({ id, label, value, setter, show, toggle }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs">{label}</Label>
                  <div className="relative">
                    <Input
                      id={id}
                      type={show ? 'text' : 'password'}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggle(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <Button
                onClick={handlePasswordChange}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full mt-2"
              >
                {passwordSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Changing…</>
                ) : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Assigned stations */}
        {stations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Stations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stations.map((station) => (
                  <div key={station._id} className="p-4 border rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{station.name}</p>
                        {station.address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{station.address}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={station.status === 'active' ? 'success' : station.status === 'maintenance' ? 'warning' : 'destructive'}
                        className="text-xs capitalize shrink-0"
                      >
                        {station.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-gray-400">Code</p>
                        <p className="font-mono font-medium text-gray-800">{station.stationCode ?? '—'}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-gray-400">Total Slots</p>
                        <p className="font-medium text-gray-800">{station.totalSlots}</p>
                      </div>
                    </div>
                    {station.operatorId && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Operator: {(station.operatorId as any).fullName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account details */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="font-medium capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Account Status</p>
                  <p className="font-medium text-success">{user?.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="font-medium">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
