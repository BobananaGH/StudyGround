import { getAccessToken } from '../../utils/storage.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/'

export class ApiError extends Error {
  constructor(status, message, detail = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function resolveUrl(path) {
  return new URL(path, API_BASE_URL).toString()
}

export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    skipAuth = false,
  } = options

  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`
    }
  }

  const fetchOptions = {
    method,
    headers: finalHeaders,
  }

  if (body !== undefined && body !== null) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body)
  }

  const response = await fetch(resolveUrl(path), fetchOptions)
  const contentType = response.headers.get('content-type') || ''

  let payload = null
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null)
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && payload.detail
        ? payload.detail
        : response.statusText || 'Request failed'

    throw new ApiError(response.status, message, payload)
  }

  return payload
}

export function get(path, options) {
  return request(path, { ...options, method: 'GET' })
}

export function post(path, body, options) {
  return request(path, { ...options, method: 'POST', body })
}

export function put(path, body, options) {
  return request(path, { ...options, method: 'PUT', body })
}

export function patch(path, body, options) {
  return request(path, { ...options, method: 'PATCH', body })
}

export function del(path, options) {
  return request(path, { ...options, method: 'DELETE' })
}
