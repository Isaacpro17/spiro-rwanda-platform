import { api } from '../lib/api'
import type { AuthResponse, LoginCredentials, User } from '../types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', credentials)
  },

  async register(data: any): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data)
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return api.get<{ user: User }>('/auth/me')
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return api.put<User>('/auth/profile', data)
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return api.post('/auth/change-password', { oldPassword, newPassword })
  },

  async requestPasswordReset(email: string): Promise<void> {
    return api.post('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return api.post('/auth/reset-password', { token, newPassword })
  },

  getToken(): string | null {
    return localStorage.getItem('token')
  },

  setToken(token: string): void {
    localStorage.setItem('token', token)
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  setStoredUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  },
}
