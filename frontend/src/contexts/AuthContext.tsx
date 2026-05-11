import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string, password: string) => Promise<User>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken()
      const storedUser = authService.getStoredUser()

      if (token && storedUser) {
        try {
          const data = await authService.getCurrentUser()
          setUser(data.user)
        } catch (error) {
          authService.logout()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (phone: string, password: string): Promise<User> => {
    const response = await authService.login({ phone, password })
    authService.setToken(response.accessToken)
    authService.setStoredUser(response.user)
    setUser(response.user)
    return response.user
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    authService.setStoredUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
