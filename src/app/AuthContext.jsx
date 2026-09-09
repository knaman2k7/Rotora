import { useState } from 'react'
import { clearToken, getToken, signIn } from './auth.js'
import { AuthContext } from './auth-context.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken())

  async function login(credentials) {
    const nextToken = await signIn(credentials)
    setToken(nextToken)
  }

  function logout() {
    clearToken()
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}