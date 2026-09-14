import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const employeeTypes = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant-manager', label: 'Assistant-Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'sales-advisor', label: 'Sales-Advisor' },
]

const fullTimeEmployeeTypes = new Set(['manager', 'assistant-manager', 'supervisor'])

const initialForm = {
  name: '',
  keyholder: false,
  employeeType: 'sales-advisor',
  contractHours: '',
  desiredHours: '',
}

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export default function AddEmployeePage() {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isFullTimeEmployee = useMemo(
    () => fullTimeEmployeeTypes.has(form.employeeType),
    [form.employeeType],
  )

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Employee name is required.')
      return
    }

    if (!form.contractHours || Number(form.contractHours) < 0) {
      setError('Enter valid contract hours.')
      return
    }

    if (!isFullTimeEmployee && (!form.desiredHours || Number(form.desiredHours) < 0)) {
      setError('Enter valid desired hours.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        name: form.name,
        keyholder: form.keyholder,
        contractHours: Number(form.contractHours),
        desiredHours: isFullTimeEmployee ? Number(form.contractHours) : Number(form.desiredHours),
        employeeType: form.employeeType,
      }

      const response = await fetch(`${API_BASE_URL}/api/newEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Unable to create employee.')
      }

      setSuccess('Employee added successfully.')
      setForm(initialForm)
    } catch (submitError) {
      setError(submitError.message || 'Unable to create employee.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="add-employee-page">
      <header className="employee-constraints-heading">
        <p className="eyebrow">Rotora</p>
        <h1>Add employee</h1>
        <p>Create a new team member and assign their availability profile.</p>
      </header>

      <section className="add-employee-panel">
        <form className="add-employee-form" onSubmit={handleSubmit}>
          <label>
            Employee name
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Alex Morgan"
              autoComplete="name"
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            Employee type
            <select
              name="employeeType"
              value={form.employeeType}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              {employeeTypes.map((employeeType) => (
                <option key={employeeType.value} value={employeeType.value}>
                  {employeeType.label}
                </option>
              ))}
            </select>
          </label>

          <label className="keyholder-control">
            <span>Keyholder</span>
            <input
              name="keyholder"
              type="checkbox"
              checked={form.keyholder}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </label>

          <label>
            Contract hours
            <input
              name="contractHours"
              type="number"
              min="0"
              step="0.5"
              value={form.contractHours}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </label>

          {!isFullTimeEmployee && (
            <label>
              Desired hours
              <input
                name="desiredHours"
                type="number"
                min="0"
                step="0.5"
                value={form.desiredHours}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </label>
          )}

          {error && <p className="form-message error" role="alert">{error}</p>}
          {success && <p className="form-message success" role="status">{success}</p>}

          <div className="add-employee-actions">
            <Link className="secondary-link" to="/dashboard">Back to dashboard</Link>
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add employee'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
