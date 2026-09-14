const TOKEN_KEY = 'rotora.auth.token'

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
  const response = await fetch('/api/login', {
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

  const response = await fetch(input, { ...init, headers })

  if (response.status === 401) {
    clearToken()
    window.location.assign('/login')
  }

  return response
}