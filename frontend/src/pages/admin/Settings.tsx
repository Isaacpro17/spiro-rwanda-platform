import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  User, Shield, CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Eye, EyeOff, Plus, Edit2, X, Globe, Activity,
  ChevronLeft, ChevronRight, Trash2, Clock, MessageSquare, Lock,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { User as UserType, SubscriptionPlanData } from '../../types'

// ── System settings types ─────────────────────────────────────────────────────
interface SwapTier { _id?: string; name: string; priceRwf: number; description: string }
interface SystemSettings {
  swapPricingTiers: SwapTier[]
  defaultOperatingHours: { open: string; close: string }
  smsTemplates: {
    en: Record<string, Record<string, string>>
    rw: Record<string, Record<string, string>>
  }
  otpExpiryMinutes: number
  maxFailedAttempts: number
  lockoutMinutes: number
}

// Map flat key 'reservation.confirmed' to nested path in settings object
function getNestedTemplate(obj: Record<string, Record<string, string>>, key: string): string {
  const [group, subKey] = key.split('.')
  return obj?.[group]?.[subKey] ?? ''
}
function setNestedTemplate(
  obj: Record<string, Record<string, string>>,
  key: string,
  value: string,
): Record<string, Record<string, string>> {
  const [group, subKey] = key.split('.')
  return { ...obj, [group]: { ...(obj[group] ?? {}), [subKey]: value } }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  _id: string
  eventType: string
  actorUserId?: string
  actorRole?: string
  resourceType?: string
  resourceId?: string
  description?: string
  ipAddress?: string
  timestamp: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function eventLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Plan Modal ────────────────────────────────────────────────────────────────

interface PlanModalProps {
  plan: SubscriptionPlanData | null
  onClose: () => void
  onSave: () => void
}

function PlanModal({ plan, onClose, onSave }: PlanModalProps) {
  const { t } = useLanguage()
  const pm = t.admin.settings.planModal
  const isEdit = !!plan
  const [name, setName] = useState(plan?.name ?? '')
  const [priceRwf, setPriceRwf] = useState(String(plan?.priceRwf ?? ''))
  const [swapsPerMonth, setSwapsPerMonth] = useState(String(plan?.swapsPerMonth ?? ''))
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !priceRwf) { setError(pm.errRequired); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        name,
        priceRwf: Number(priceRwf),
        swapsPerMonth: swapsPerMonth ? Number(swapsPerMonth) : undefined,
        isActive,
      }
      if (isEdit) {
        await api.put(`/subscriptions/plans/${plan!._id}`, body)
      } else {
        await api.post('/subscriptions/plans', body)
      }
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? pm.titleEdit : pm.titleCreate}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{pm.planName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Basic / Standard / Premium" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pm.price}</Label>
            <Input type="number" min="0" value={priceRwf} onChange={(e) => setPriceRwf(e.target.value)} placeholder="5000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pm.swapsPerMonth}</Label>
            <Input type="number" min="0" value={swapsPerMonth} onChange={(e) => setSwapsPerMonth(e.target.value)} placeholder="30" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="plan-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="plan-active" className="text-xs cursor-pointer">{pm.activeLabel}</Label>
          </div>
          {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{pm.cancel}</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? pm.saveChanges : pm.createPlan}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LOG_PAGE_SIZE = 50

export function Settings() {
  const { user, updateUser } = useAuth()
  const { t, lang, toggle } = useLanguage()
  const s = t.admin.settings

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
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Plans
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [planModal, setPlanModal] = useState<SubscriptionPlanData | null | 'new'>()

  // Audit log
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

  // System settings
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null)
  const [tiers, setTiers] = useState<SwapTier[]>([])
  const [opHours, setOpHours] = useState({ open: '06:00', close: '22:00' })
  const [smsLang, setSmsLang] = useState<'en' | 'rw'>('en')
  const [smsEn, setSmsEn] = useState<Record<string, Record<string, string>>>({})
  const [smsRw, setSmsRw] = useState<Record<string, Record<string, string>>>({})
  const [otpExpiry, setOtpExpiry] = useState(10)
  const [maxFailed, setMaxFailed] = useState(5)
  const [lockout, setLockout] = useState(30)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingMsg, setPricingMsg] = useState('')
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursMsg, setHoursMsg] = useState('')
  const [smsSaving, setSmsSaving] = useState(false)
  const [smsMsg, setSmsMsg] = useState('')
  const [secSaving, setSecSaving] = useState(false)
  const [secMsg, setSecMsg] = useState('')

  // Prefill from auth context
  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '')
      setPhone(user.phone ?? '')
      setEmail(user.email ?? '')
      setLanguage(user.language ?? 'rw')
    }
  }, [user])

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get<{ user: UserType }>('/auth/me')
      const u = (me as any)?.user ?? me
      setFullName(u.fullName ?? '')
      setPhone(u.phone ?? '')
      setEmail(u.email ?? '')
      setLanguage(u.language ?? 'rw')
    } catch { /* keep existing values */ }
  }, [])

  const loadPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const res = await api.get<SubscriptionPlanData[]>('/subscriptions/plans')
      setPlans(res as any ?? [])
    } catch { /* ignore */ }
    finally { setPlansLoading(false) }
  }, [])

  const loadLogs = useCallback(async (p: number) => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const res = await api.get<{ entries: AuditEntry[]; total: number }>(
        `/audit/logs?page=${p}&limit=${LOG_PAGE_SIZE}`
      )
      setLogs((res as any)?.entries ?? [])
      setLogTotal((res as any)?.total ?? 0)
    } catch (err: any) {
      setLogsError(err.response?.data?.message ?? err.message ?? 'Failed to load audit log')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const loadSystemSettings = useCallback(async () => {
    try {
      const data = await api.get<SystemSettings>('/system-settings')
      const d = data as any
      setSysSettings(d)
      setTiers(d.swapPricingTiers ?? [])
      setOpHours(d.defaultOperatingHours ?? { open: '06:00', close: '22:00' })
      setSmsEn(d.smsTemplates?.en ?? {})
      setSmsRw(d.smsTemplates?.rw ?? {})
      setOtpExpiry(d.otpExpiryMinutes ?? 10)
      setMaxFailed(d.maxFailedAttempts ?? 5)
      setLockout(d.lockoutMinutes ?? 30)
    } catch { /* keep defaults */ }
  }, [])

  const flash = (setter: (v: string) => void, msg: string) => {
    setter(msg)
    setTimeout(() => setter(''), 3500)
  }

  const savePricing = async () => {
    setPricingSaving(true)
    try {
      await api.put('/system-settings', { swapPricingTiers: tiers.map(({ _id, ...rest }) => rest) })
      flash(setPricingMsg, s.pricingSaved)
      await loadSystemSettings()
    } catch { flash(setPricingMsg, s.sectionError) }
    finally { setPricingSaving(false) }
  }

  const saveHours = async () => {
    setHoursSaving(true)
    try {
      await api.put('/system-settings', { defaultOperatingHours: opHours })
      flash(setHoursMsg, s.hoursSaved)
    } catch { flash(setHoursMsg, s.sectionError) }
    finally { setHoursSaving(false) }
  }

  const saveSmsTemplates = async () => {
    setSmsSaving(true)
    try {
      await api.put('/system-settings', { smsTemplates: { en: smsEn, rw: smsRw } })
      flash(setSmsMsg, s.smsSaved)
    } catch { flash(setSmsMsg, s.sectionError) }
    finally { setSmsSaving(false) }
  }

  const saveSecurity = async () => {
    setSecSaving(true)
    try {
      await api.put('/system-settings', { otpExpiryMinutes: otpExpiry, maxFailedAttempts: maxFailed, lockoutMinutes: lockout })
      flash(setSecMsg, s.securitySaved)
    } catch { flash(setSecMsg, s.sectionError) }
    finally { setSecSaving(false) }
  }

  useEffect(() => { loadMe(); loadPlans(); loadSystemSettings() }, [loadMe, loadPlans, loadSystemSettings])
  useEffect(() => { loadLogs(logPage) }, [logPage, loadLogs])

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileSuccess('')
    setProfileError('')
    try {
      const result = await api.put<{ user: UserType }>('/auth/me', { fullName, phone, email, language })
      const updated = (result as any)?.user ?? result
      updateUser(updated as UserType)
      if (language !== lang) toggle()
      setProfileSuccess('Profile updated.')
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (err: any) {
      setProfileError(err.response?.data?.message ?? err.message ?? 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { setPasswordError(s.errPasswordMatch); return }
    if (newPassword.length < 8) { setPasswordError(s.errPasswordLength); return }
    setPasswordSaving(true)
    setPasswordSuccess('')
    setPasswordError('')
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword })
      setPasswordSuccess('Password changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err: any) {
      setPasswordError(err.response?.data?.message ?? err.message ?? 'Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const logTotalPages = Math.ceil(logTotal / LOG_PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{s.title}</h1>
            <p className="text-gray-600 mt-1">{s.subtitle}</p>
          </div>
        </div>

        {/* Profile + Password side by side */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>{s.adminProfile}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />{profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-lg text-sm text-error">
                  <AlertCircle className="w-4 h-4" />{profileError}
                </div>
              )}

              {[
                { id: 'fn', label: s.fullName, icon: <User className="w-3.5 h-3.5" />, value: fullName, setter: setFullName, type: 'text', placeholder: 'Jean Bosco' },
                { id: 'ph', label: s.phone, icon: null as React.ReactNode, value: phone, setter: setPhone, type: 'tel', placeholder: '+250 7XX XXX XXX' },
                { id: 'em', label: s.email, icon: null as React.ReactNode, value: email, setter: setEmail, type: 'email', placeholder: 'admin@spiro.com' },
              ].map(({ id, label, icon, value, setter, type, placeholder }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs flex items-center gap-1">
                    {icon}{label}
                  </Label>
                  <Input id={id} type={type} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
                </div>
              ))}

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{s.language}</Label>
                <div className="flex gap-2">
                  {(['en', 'rw'] as const).map((lg) => (
                    <button
                      key={lg}
                      onClick={() => setLanguage(lg)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        language === lg ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {lg === 'en' ? s.langEn : s.langRw}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleProfileSave} disabled={profileSaving} className="w-full">
                {profileSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{s.saving}</> : s.saveProfile}
              </Button>

              {/* Account meta */}
              <div className="pt-3 border-t grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-error" />
                  <span className="text-gray-600 capitalize">{user?.role ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-gray-600">{user?.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>{s.changePassword}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />{passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/20 rounded-lg text-sm text-error">
                  <AlertCircle className="w-4 h-4" />{passwordError}
                </div>
              )}

              {[
                { id: 'cp', label: s.currentPassword, value: currentPassword, setter: setCurrentPassword, show: showCur, toggle: setShowCur },
                { id: 'np', label: s.newPassword, value: newPassword, setter: setNewPassword, show: showNew, toggle: setShowNew },
                { id: 'conf', label: s.confirmPassword, value: confirmPassword, setter: setConfirmPassword, show: showConf, toggle: setShowConf },
              ].map(({ id, label, value, setter, show, toggle: toggleVis }) => (
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
                      onClick={() => toggleVis(!show)}
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
                className="w-full"
              >
                {passwordSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{s.changing}</> : s.changePasswordBtn}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{s.plansTitle}</CardTitle>
              <Button size="sm" onClick={() => setPlanModal('new')}>
                <Plus className="w-4 h-4 mr-1" />{s.newPlan}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">{s.noPlans}</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div key={plan._id} className="p-4 border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-xl font-bold text-primary mt-0.5">
                          RWF {plan.priceRwf.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-xs">
                          {plan.isActive ? s.planActive : s.planInactive}
                        </Badge>
                        <button
                          onClick={() => setPlanModal(plan)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {plan.swapsPerMonth && (
                      <p className="text-xs text-gray-500">{plan.swapsPerMonth} {s.swapsPerMonth}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Swap Pricing Tiers ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{s.swapPricingTitle}</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">{s.swapPricingDesc}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTiers(prev => [...prev, { name: '', priceRwf: 0, description: '' }])}>
                <Plus className="w-4 h-4 mr-1" />{s.addTierBtn}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tiers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{s.noTiers}</p>
            ) : (
              tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_1fr_auto] gap-2 items-start">
                  <div>
                    <Label className="text-xs">{s.tierName}</Label>
                    <Input
                      value={tier.name}
                      onChange={e => setTiers(prev => prev.map((t, j) => j === i ? { ...t, name: e.target.value } : t))}
                      placeholder={s.tierNamePlaceholder}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{s.tierPrice}</Label>
                    <Input
                      type="number" min="0"
                      value={tier.priceRwf}
                      onChange={e => setTiers(prev => prev.map((t, j) => j === i ? { ...t, priceRwf: Number(e.target.value) } : t))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{s.tierDesc}</Label>
                    <Input
                      value={tier.description}
                      onChange={e => setTiers(prev => prev.map((t, j) => j === i ? { ...t, description: e.target.value } : t))}
                      placeholder={s.tierDescPlaceholder}
                    />
                  </div>
                  <button
                    onClick={() => setTiers(prev => prev.filter((_, j) => j !== i))}
                    className="mt-5 p-2 text-gray-400 hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
            <div className="flex items-center justify-between pt-2">
              {pricingMsg ? (
                <p className={`text-xs flex items-center gap-1 ${pricingMsg === s.sectionError ? 'text-error' : 'text-success'}`}>
                  {pricingMsg === s.sectionError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {pricingMsg}
                </p>
              ) : <span />}
              <Button size="sm" onClick={savePricing} disabled={pricingSaving}>
                {pricingSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{s.savingSection}</> : s.savePricing}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Default Station Operating Hours ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />{s.operatingHoursTitle}</CardTitle>
            <p className="text-xs text-gray-500">{s.operatingHoursDesc}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{s.openTime}</Label>
                <Input type="time" value={opHours.open} onChange={e => setOpHours(h => ({ ...h, open: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.closeTime}</Label>
                <Input type="time" value={opHours.close} onChange={e => setOpHours(h => ({ ...h, close: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              {hoursMsg ? (
                <p className={`text-xs flex items-center gap-1 ${hoursMsg === s.sectionError ? 'text-error' : 'text-success'}`}>
                  {hoursMsg === s.sectionError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {hoursMsg}
                </p>
              ) : <span />}
              <Button size="sm" onClick={saveHours} disabled={hoursSaving}>
                {hoursSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{s.savingSection}</> : s.saveHours}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── SMS Notification Templates ─────────────────────────────── */}
        {(() => {
          const SMS_KEYS = [
            'reservation.confirmed', 'reservation.cancelled', 'reservation.expired',
            'payment.success', 'payment.failed', 'swap.completed',
            'low.inventory', 'maintenance.created',
          ] as const
          const currentTemplates = smsLang === 'en' ? smsEn : smsRw
          const setCurrentTemplates = smsLang === 'en' ? setSmsEn : setSmsRw
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />{s.smsTemplatesTitle}</CardTitle>
                <p className="text-xs text-gray-500">{s.smsTemplatesDesc}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Language tabs */}
                <div className="flex gap-1 border-b border-gray-200 pb-3">
                  {(['en', 'rw'] as const).map(lg => (
                    <button
                      key={lg}
                      onClick={() => setSmsLang(lg)}
                      className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                        smsLang === lg ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lg === 'en' ? s.smsLangEn : s.smsLangRw}
                    </button>
                  ))}
                </div>

                {/* Token hint */}
                <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg font-mono">{s.smsTokensHint}</p>

                {/* Template text areas */}
                <div className="space-y-3">
                  {SMS_KEYS.map(key => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{(s.templateLabels as any)[key]}</Label>
                      <textarea
                        rows={2}
                        value={getNestedTemplate(currentTemplates, key)}
                        onChange={e => setCurrentTemplates(prev => setNestedTemplate(prev, key, e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {smsMsg ? (
                    <p className={`text-xs flex items-center gap-1 ${smsMsg === s.sectionError ? 'text-error' : 'text-success'}`}>
                      {smsMsg === s.sectionError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {smsMsg}
                    </p>
                  ) : <span />}
                  <Button size="sm" onClick={saveSmsTemplates} disabled={smsSaving}>
                    {smsSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{s.savingSection}</> : s.saveSms}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* ── Security Settings ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />{s.securityTitle}</CardTitle>
            <p className="text-xs text-gray-500">{s.securityDesc}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{s.otpExpiry}</Label>
                <Input type="number" min="1" max="60" value={otpExpiry} onChange={e => setOtpExpiry(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.maxFailed}</Label>
                <Input type="number" min="1" max="20" value={maxFailed} onChange={e => setMaxFailed(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.lockoutDuration}</Label>
                <Input type="number" min="1" max="1440" value={lockout} onChange={e => setLockout(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              {secMsg ? (
                <p className={`text-xs flex items-center gap-1 ${secMsg === s.sectionError ? 'text-error' : 'text-success'}`}>
                  {secMsg === s.sectionError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {secMsg}
                </p>
              ) : <span />}
              <Button size="sm" onClick={saveSecurity} disabled={secSaving}>
                {secSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{s.savingSection}</> : s.saveSecurity}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{s.auditTitle}</CardTitle>
              <button onClick={() => loadLogs(logPage)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : logsError ? (
              <div className="flex items-center gap-3 p-4 text-sm text-error">
                <AlertCircle className="w-4 h-4" />{logsError}
                <Button variant="ghost" size="sm" onClick={() => loadLogs(logPage)} className="ml-auto text-error">{s.auditRetry}</Button>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">{s.noAudit}</p>
            ) : (
              <>
                <div className="divide-y">
                  {logs.map((entry) => (
                    <div key={entry._id} className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{eventLabel(entry.eventType)}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                          {entry.actorRole && (
                            <span className="text-xs text-gray-500 capitalize">{entry.actorRole}</span>
                          )}
                          {entry.resourceType && (
                            <span className="text-xs text-gray-400">{entry.resourceType}</span>
                          )}
                          {entry.description && (
                            <span className="text-xs text-gray-500 truncate">{entry.description}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDateTime(entry.timestamp)}</p>
                    </div>
                  ))}
                </div>

                {logTotalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">{s.page} {logPage} {s.of} {logTotalPages} · {logTotal} {s.entries}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage === 1 || logsLoading}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))} disabled={logPage >= logTotalPages || logsLoading}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan modal */}
      {(planModal === 'new' || (planModal && typeof planModal === 'object')) && (
        <PlanModal
          plan={planModal === 'new' ? null : planModal as SubscriptionPlanData}
          onClose={() => setPlanModal(undefined)}
          onSave={loadPlans}
        />
      )}
    </DashboardLayout>
  )
}
