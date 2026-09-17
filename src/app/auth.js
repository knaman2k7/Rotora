const TOKEN_KEY = 'rotora.auth.token'

// Empty string resolves to a relative URL, which is correct whenever the
// frontend is served by the same origin as the API (production, and local
// dev via the vite proxy in vite.config.js). Set VITE_API_URL only if the
// API lives on a different origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const SLOW_REQUEST_MS = 3000
const slowRequestListeners = new Set()

function notifySlowRequestListeners(isSlow) {
  for (const listener of slowRequestListeners) listener(isSlow)
}

export function onSlowRequestChange(listener) {
  slowRequestListeners.add(listener)
  return () => slowRequestListeners.delete(listener)
}

async function fetchWithSlowNotice(input, init) {
  const timeoutId = setTimeout(() => notifySlowRequestListeners(true), SLOW_REQUEST_MS)
  try {
    return await fetch(input, init)
  } finally {
    clearTimeout(timeoutId)
    notifySlowRequestListeners(false)
  }
}

function resolveUrl(path) {
  return typeof path === 'string' && path.startsWith('/') ? `${API_BASE_URL}${path}` : path
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export async function signIn(credentials) {
  const response = await fetchWithSlowNotice(resolveUrl('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Unable to sign in.')
  }

  if (!data.token) {
    throw new Error('The sign-in response did not include a token.')
  }

  saveToken(data.token)
  return data.token
}

export async function apiFetch(input, init = {}) {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetchWithSlowNotice(resolveUrl(input), { ...init, headers })

  if (response.status === 401) {
    clearToken()
    window.location.assign('/login')
  }

  return response
}
