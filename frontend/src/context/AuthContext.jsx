import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { API_ENDPOINTS } from '../services/api/endpoints.js'
import { get, ApiError } from '../services/api/client.js'
import { authService } from '../services/auth.service.js'
import {
  getStoredAuthSnapshot,
  setUser,
  setAuthStorageMode,
  clearAuthStorage,
} from '../utils/storage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const snapshot = useMemo(() => getStoredAuthSnapshot(), [])

  const [user, setUserState] = useState(snapshot.user)
  const [accessToken, setAccessToken] = useState(snapshot.accessToken)
  const [refreshToken, setRefreshToken] = useState(snapshot.refreshToken)
  const [isLoading, setIsLoading] = useState(Boolean(snapshot.accessToken))
  const [error, setError] = useState('')

  const validateSession = useCallback(async (token) => {
    if (!token) return null
    try {
      return await get(API_ENDPOINTS.AUTH.ME)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearAuthStorage()
        return null
      }
      // Network failure: keep cached snapshot so the user is not bounced to /login.
      return snapshot.user
    }
  }, [snapshot.user])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!snapshot.accessToken) {
        setIsLoading(false)
        return
      }

      const me = await validateSession(snapshot.accessToken)
      if (cancelled) return

      if (me) {
        setUser(me)
        setUserState(me)
      } else {
        setUserState(null)
        setAccessToken(null)
        setRefreshToken(null)
      }

      setIsLoading(false)
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [snapshot.accessToken, validateSession])

  const login = useCallback(async ({ username, password, rememberMe = true }) => {
    setError('')
    setAuthStorageMode(rememberMe)
    const response = await authService.login({ username, password })

    setUserState(response?.user || null)
    setAccessToken(response?.tokens?.access || null)
    setRefreshToken(response?.tokens?.refresh || null)

    return response
  }, [])

  const register = useCallback(async (payload, { rememberMe = true } = {}) => {
    setError('')
    setAuthStorageMode(rememberMe)
    const response = await authService.register(payload)

    setUserState(response?.user || null)
    setAccessToken(response?.tokens?.access || null)
    setRefreshToken(response?.tokens?.refresh || null)

    return response
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUserState(null)
    setAccessToken(null)
    setRefreshToken(null)
    setError('')
  }, [])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      error,
      setError,
      login,
      register,
      logout,
    }),
    [user, accessToken, refreshToken, isLoading, error, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }
  return context
}

export default AuthContext
