import { API_ENDPOINTS } from './api/endpoints.js'
import { get, post } from './api/client.js'
import { clearAuthStorage, setTokens, setUser, getRefreshToken, getAccessToken } from '../utils/storage.js'

export async function login(credentials) {
  const response = await post(API_ENDPOINTS.AUTH.LOGIN, {
    username: credentials.username,
    password: credentials.password,
  }, { skipAuth: true })

  if (response?.tokens) {
    setTokens(response.tokens)
  }

  if (response?.user) {
    setUser(response.user)
  }

  return response
}

export async function register(payload) {
  const response = await post(API_ENDPOINTS.AUTH.REGISTER, payload, { skipAuth: true })

  if (response?.tokens) {
    setTokens(response.tokens)
  }

  if (response?.user) {
    setUser(response.user)
  }

  return response
}

export async function fetchCurrentUser() {
  if (!getAccessToken()) {
    throw new Error('Not authenticated')
  }

  return get(API_ENDPOINTS.AUTH.ME)
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    throw new Error('No refresh token')
  }

  const response = await post(API_ENDPOINTS.AUTH.REFRESH, { refresh }, { skipAuth: true })

  if (response?.access) {
    setTokens({ access: response.access, refresh })
  }

  return response
}

export function logout() {
  clearAuthStorage()
}

export const authService = {
  login,
  register,
  fetchCurrentUser,
  refreshAccessToken,
  logout,
}

export default authService
