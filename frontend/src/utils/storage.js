const ACCESS_TOKEN_KEY = 'StudyGround-access-token'
const REFRESH_TOKEN_KEY = 'StudyGround-refresh-token'
const USER_KEY = 'StudyGround-user'
const AUTH_STORAGE_MODE_KEY = 'StudyGround-auth-storage-mode'
const LOCAL_MODE = 'local'
const SESSION_MODE = 'session'

function safeRead(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore unavailable storage.
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore unavailable storage.
  }
}

function removeFromAllStorages(key) {
  safeRemove(localStorage, key)
  safeRemove(sessionStorage, key)
}

export function getAuthStorageMode() {
  const storedMode = safeRead(localStorage, AUTH_STORAGE_MODE_KEY)
  return storedMode === SESSION_MODE ? SESSION_MODE : LOCAL_MODE
}

export function setAuthStorageMode(rememberMe = true) {
  const mode = rememberMe ? LOCAL_MODE : SESSION_MODE
  safeWrite(localStorage, AUTH_STORAGE_MODE_KEY, mode)
  return mode
}

function getAuthStorage() {
  return getAuthStorageMode() === SESSION_MODE ? sessionStorage : localStorage
}

export function getAccessToken() {
  return safeRead(getAuthStorage(), ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return safeRead(getAuthStorage(), REFRESH_TOKEN_KEY)
}

export function setAccessToken(token) {
  if (!token) {
    removeFromAllStorages(ACCESS_TOKEN_KEY)
    return
  }

  safeWrite(getAuthStorage(), ACCESS_TOKEN_KEY, token)
}

export function setRefreshToken(token) {
  if (!token) {
    removeFromAllStorages(REFRESH_TOKEN_KEY)
    return
  }

  safeWrite(getAuthStorage(), REFRESH_TOKEN_KEY, token)
}

export function setTokens(tokens) {
  if (tokens?.access) {
    setAccessToken(tokens.access)
  }

  if (tokens?.refresh) {
    setRefreshToken(tokens.refresh)
  }
}

export function clearTokens() {
  removeFromAllStorages(ACCESS_TOKEN_KEY)
  removeFromAllStorages(REFRESH_TOKEN_KEY)
}

export function getUser() {
  const rawUser = safeRead(getAuthStorage(), USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    safeRemove(getAuthStorage(), USER_KEY)
    return null
  }
}

export function setUser(user) {
  if (!user) {
    removeFromAllStorages(USER_KEY)
    return
  }

  safeWrite(getAuthStorage(), USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
  clearTokens()
  removeFromAllStorages(USER_KEY)
  safeRemove(localStorage, AUTH_STORAGE_MODE_KEY)
}

export function getStoredAuthSnapshot() {
  return {
    mode: getAuthStorageMode(),
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
    user: getUser(),
  }
}

