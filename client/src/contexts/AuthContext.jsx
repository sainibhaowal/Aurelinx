/**
 * Authentication Context
 * Manages user authentication state, tokens, and login/logout
 */

import React, { createContext, useState, useCallback, useEffect } from 'react'
import { authAPI, APIError } from '../services/apiClient'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))

  const resolveWithTimeout = useCallback((promise, timeoutMs = 4000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('Authentication bootstrap timed out')), timeoutMs)
      }),
    ])
  }, [])

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = await resolveWithTimeout(authAPI.getCurrentUser())
          setUser(userData)
          setError(null)
        } catch (err) {
          // Token is invalid
          localStorage.removeItem('auth_token')
          setToken(null)
          setUser(null)
          setError(err)
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [resolveWithTimeout, token])

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
      setError(null)
      setLoading(false)
    }

    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      const response = await authAPI.login(email, password)

      // Save token
      localStorage.setItem('auth_token', response.access_token)
      setToken(response.access_token)

      // Get user data
      const userData = await resolveWithTimeout(authAPI.getCurrentUser())
      setUser(userData)

      return { success: true, user: userData }
    } catch (err) {
      const error = new APIError(
        err.error_code || 'LOGIN_FAILED',
        err.message || 'Login failed. Please try again.',
        err.status
      )
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [resolveWithTimeout])

  const register = useCallback(async (email, fullName, password) => {
    setLoading(true)
    setError(null)

    try {
      const userData = await authAPI.register(email, fullName, password)
      return { success: true, user: userData }

    } catch (err) {
      const error = new APIError(
        err.error_code || 'REGISTRATION_FAILED',
        err.message || 'Registration failed. Please try again.',
        err.status
      )
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
