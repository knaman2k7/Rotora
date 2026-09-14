import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../app/auth.js'

const employeeTypes = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant-manager', label: 'Assistant-Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'sales-advisor', label: 'Sales-Advisor' },
]

const employeeTypeLabels = Object.fromEntries(employeeTypes.map((type) => [type.value, type.label]))

const fullTimeEmployeeTypes = new Set(['manager', 'assistant-manager', 'supervisor'])

const initialForm = {
  name: '',
  keyholder: false,
  employeeType: 'sales-advisor',
  contractHours: '',
  desiredHours: '',
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [listError, setListError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isFullTimeEmployee = useMemo(
    () => fullTimeEmployeeTypes.has(form.employeeType),
    [form.employeeType],
  )

  async function loadEmployees() {
    setIsLoadingEmployees(true)
    setListError('')
    try {
      const response = await apiFetch('/api/employees')
      if (!response.ok) throw new Error('Unable to load employees.')
      const data = await response.json()
      setEmployees(data.employees ?? [])
    } catch (loadError) {
      setListError(loadError.message || 'Unable to load employees.')
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

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

      const response = await apiFetch('/api/newEmployee', {
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
      loadEmployees()
    } catch (submitError) {
      setError(submitError.message || 'Unable to create employee.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(employee) {
    const confirmed = window.confirm(`Delete ${employee.name}? This removes their details, constraints, and annual leave records.`)
    if (!confirmed) return

    setDeletingId(employee.id)
    setListError('')
    try {
      const response = await apiFetch(`/api/employee/${employee.id}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to delete employee.')
      }
      setEmployees((current) => current.filter((item) => item.id !== employee.id))
    } catch (deleteError) {
      setListError(deleteError.message || 'Unable to delete employee.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="employee-constraints-view">
      <header className="employee-constraints-heading">
        <p className="eyebrow">Rotora</p>
        <h1>Employee Management</h1>
        <p>Add new team members or remove employees who have left.</p>
      </header>

      <section className="add-employee-panel">
        <div className="section-heading">
          <div><p className="eyebrow">New team member</p><h2>Add employee</h2></div>
        </div>
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
            <span aria-hidden="true" />
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add employee'}
            </button>
          </div>
        </form>
      </section>

      <section className="employee-list-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Current roster</p><h2>Employees</h2></div>
        </div>

        {isLoadingEmployees && <p className="constraints-status">Loading employees...</p>}
        {!isLoadingEmployees && listError && <p className="form-message error" role="alert">{listError}</p>}
        {!isLoadingEmployees && !listError && employees.length === 0 && (
          <div className="constraints-empty-state">
            <p>No employees yet.</p>
          </div>
        )}

        {!isLoadingEmployees && employees.length > 0 && (
          <ul className="employee-management-list">
            {employees.map((employee) => (
              <li className="employee-management-row" key={employee.id}>
                <div className="employee-management-info">
                  <strong>{employee.name}</strong>
                  <small>
                    {employeeTypeLabels[employee.employee_type] ?? employee.employee_type}
                    {employee.keyholder ? ' · Keyholder' : ''}
                    {' · '}{employee.contract_hours} contract hrs
                  </small>
                </div>
                <button
                  className="constraints-delete"
                  type="button"
                  disabled={deletingId === employee.id}
                  onClick={() => handleDelete(employee)}
                >
                  {deletingId === employee.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
