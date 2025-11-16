import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  tier: 'free' | 'premium'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr))
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      } catch (error) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { account, accessToken, refreshToken } = response.data.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(account))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(account)
  }

  const signup = async (email: string, password: string) => {
    const response = await api.post('/auth/signup', { email, password })
    const { account, accessToken, refreshToken } = response.data.data

    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(account))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(account)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      logout()
      return
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefreshToken } = response.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } catch (error) {
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshToken }}>
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

