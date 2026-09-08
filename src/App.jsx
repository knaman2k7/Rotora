

import { useState } from 'react'
import './App.css'

const initialForm = { email: '', password: '' }

export default function App() {
  const [form, setForm] = useState(initialForm)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setMessage(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.message || 'Unable to sign in.')

      setMessage({ type: 'success', text: data.message || 'You are signed in.' })
      if (!rememberMe) setForm((current) => ({ ...current, password: '' }))
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="form-panel">
        <div className="form-wrap">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to Rotora</h2>
          <p className="form-intro">Enter your details to pick up where you left off.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required />

            <div className="label-row">
              <label htmlFor="password">Password</label>
              <a href="mailto:support@rotora.app?subject=Reset%20password">Forgot password?</a>
            </div>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={handleChange} minLength="8" required />

            <label className="checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>Keep me signed in</span>
            </label>

            {message && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}