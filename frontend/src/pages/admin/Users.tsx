import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import {
  Users as UsersIcon, Search, Plus, Edit2, Trash2, Key, Shield,
  CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, X, Eye, EyeOff, UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import type { User } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserStats {
  total: number
  byRole: { rider: number; operator: number; admin: number; technician: number }
  byStatus: { active: number; inactive: number; verified: number; unverified: number }
}

type UserRole = 'rider' | 'operator' | 'technician' | 'admin'

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadgeVariant(role: UserRole) {
  if (role === 'admin') return 'destructive' as const
  if (role === 'operator') return 'warning' as const
  if (role === 'technician') return 'default' as const
  return 'secondary' as const
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Create / Edit User Modal ──────────────────────────────────────────────────

interface UserModalProps {
  user: User | null
  onClose: () => void
  onSave: () => void
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const { t } = useLanguage()
  const um = t.admin.users.modal
  const isEdit = !!user
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'rider')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim()) {
      setError(um.errRequired)
      return
    }
    if (!isEdit && !password) {
      setError(um.errPasswordRequired)
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/users/${user!._id}`, { fullName, phone, email, role })
      } else {
        await api.post('/users', { fullName, phone, email, role, password })
      }
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? um.titleEdit : um.titleCreate}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{um.fullName}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Bosco" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{um.phone}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{um.email}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{um.role}</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="rider">{t.admin.users.roleRider}</option>
              <option value="operator">{t.admin.users.roleOperator}</option>
              <option value="technician">{t.admin.users.roleTechnician}</option>
              <option value="admin">{t.admin.users.roleAdmin}</option>
            </select>
          </div>
          {!isEdit && (
            <div className="space-y-1">
              <Label className="text-xs">{um.password}</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={um.passwordPlaceholder}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-error flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{um.cancel}</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? um.saveChanges : um.createUser}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useLanguage()
  const rm = t.admin.users.resetModal
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (password.length < 8) { setError(rm.errLength); return }
    setSaving(true)
    setError('')
    try {
      await api.put(`/users/${user._id}/password`, { password })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{rm.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{rm.desc} <strong>{user.fullName}</strong></p>
        {success ? (
          <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-sm text-success mb-3">
            <CheckCircle2 className="w-4 h-4" />{rm.success}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={rm.placeholder}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="flex-1">{rm.cancel}</Button>
              <Button size="sm" onClick={handleReset} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{rm.reset}
              </Button>
            </div>
          </div>
        )}
        {success && <Button size="sm" onClick={onClose} className="w-full">{rm.done}</Button>}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function Users() {
  const { t } = useLanguage()
  const u = t.admin.users
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalUser, setModalUser] = useState<User | null | 'new'>()
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadData = useCallback(async (p: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('isActive', statusFilter)

      const [usersRes, statsRes] = await Promise.all([
        api.get<{ users: User[]; pagination: { total: number } }>(`/users?${params}`),
        api.get<UserStats>('/users/stats'),
      ])
      setUsers((usersRes as any)?.users ?? [])
      setTotal((usersRes as any)?.pagination?.total ?? 0)
      setStats(statsRes as any ?? null)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => { setPage(1); loadData(1) }, [search, roleFilter, statusFilter]) // eslint-disable-line
  useEffect(() => { loadData(page) }, [page]) // eslint-disable-line

  const handleToggleStatus = async (user: User) => {
    setTogglingId(user._id)
    try {
      await api.put(`/users/${user._id}/status`, { isActive: !user.isActive })
      setUsers((prev) => prev.map((usr) => usr._id === user._id ? { ...usr, isActive: !usr.isActive } : usr))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget._id)
    try {
      await api.delete(`/users/${deleteTarget._id}`)
      setDeleteTarget(null)
      loadData(page)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete user')
      setDeleteTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{u.title}</h1>
            <p className="text-gray-600 mt-1">{u.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadData(page)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setModalUser('new')}>
              <Plus className="w-4 h-4 mr-1" />{u.addUser}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => loadData(page)} className="ml-auto text-error">{u.retry}</Button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: u.statTotal, value: stats.total, icon: <UsersIcon className="w-5 h-5" />, color: 'text-primary' },
              { label: u.statActive, value: stats.byStatus.active, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-success' },
              { label: u.statRiders, value: stats.byRole.rider, icon: <UserCheck className="w-5 h-5" />, color: 'text-gray-700' },
              { label: u.statOperators, value: stats.byRole.operator, icon: <Shield className="w-5 h-5" />, color: 'text-warning' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">{s.icon}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder={u.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{u.allRoles}</option>
                <option value="rider">{u.roleRider}</option>
                <option value="operator">{u.roleOperator}</option>
                <option value="technician">{u.roleTechnician}</option>
                <option value="admin">{u.roleAdmin}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{u.allStatus}</option>
                <option value="true">{u.statusActive}</option>
                <option value="false">{u.statusInactive}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              {u.cardTitle}
              {!isLoading && <span className="ml-2 text-sm font-normal text-gray-400">({total} total)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <UsersIcon className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">{u.emptyTitle}</p>
                <p className="text-xs text-gray-500">{u.emptyDesc}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{u.colName}</TableHead>
                        <TableHead>{u.colPhone}</TableHead>
                        <TableHead>{u.colRole}</TableHead>
                        <TableHead>{u.colStatus}</TableHead>
                        <TableHead>{u.colVerified}</TableHead>
                        <TableHead>{u.colJoined}</TableHead>
                        <TableHead className="text-right">{u.colActions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((usr) => (
                        <TableRow key={usr._id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{usr.fullName}</p>
                              {usr.email && <p className="text-xs text-gray-500">{usr.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 font-mono">{usr.phone}</TableCell>
                          <TableCell>
                            <Badge variant={roleBadgeVariant(usr.role)} className="text-xs capitalize">
                              {usr.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleStatus(usr)}
                              disabled={togglingId === usr._id}
                              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                            >
                              {togglingId === usr._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              ) : usr.isActive ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-success">{u.statusActive}</span></>
                              ) : (
                                <><XCircle className="w-3.5 h-3.5 text-error" /><span className="text-error">{u.statusInactive}</span></>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            {usr.isPhoneVerified
                              ? <CheckCircle2 className="w-4 h-4 text-success" />
                              : <XCircle className="w-4 h-4 text-gray-300" />}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{fmtDate(usr.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setModalUser(usr)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setResetUser(usr)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-warning hover:bg-warning/5 transition-colors"
                                title="Reset Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(usr)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-error/5 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <span className="text-xs text-gray-500">{u.page} {page} {u.of} {totalPages} · {total} {u.totalUsers}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
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

      {/* Modals */}
      {(modalUser === 'new' || (modalUser && typeof modalUser === 'object')) && (
        <UserModal
          user={modalUser === 'new' ? null : modalUser as User}
          onClose={() => setModalUser(undefined)}
          onSave={() => loadData(page)}
        />
      )}

      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">{u.deleteModal.title}</h2>
            <p className="text-sm text-gray-600 mb-5">
              {u.deleteModal.desc.replace('{name}', deleteTarget.fullName)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="flex-1">{u.deleteModal.cancel}</Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={!!deletingId}
                className="flex-1 bg-error hover:bg-error/90 text-white"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                {u.deleteModal.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
