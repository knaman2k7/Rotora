

import { useState } from 'react'
import './App.css'

const initialForm = { username: '', password: '' }

export default function App() {
  const [form, setForm] = useState(initialForm)
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
          <h2>Sign in to Rotora</h2>
          <br/><br/>

          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" placeholder="Enter your username" value={form.username} onChange={handleChange} required />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={handleChange} minLength="8" required />

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