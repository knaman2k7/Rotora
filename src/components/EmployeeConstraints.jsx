import { useEffect, useMemo, useState } from 'react'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdayShifts = [
  { type: 1, label: '10am - 7pm', name: 'Morning · 8 hour' },
  { type: 2, label: '10am - 4pm', name: 'Morning · 6 hour' },
  { type: 3, label: '11am - 8pm', name: 'Evening · 8 hour' },
  { type: 4, label: '2pm - 8pm', name: 'Evening · 6 hour' },
]
const sundayShifts = [
  { type: 1, label: '9am - 6pm', name: 'Full day' },
  { type: 2, label: '12pm - 6pm', name: 'Part-time' },
]
const employeeTypes = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant-manager', label: 'Assistant-Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'keyholder', label: 'Keyholder' },
  { value: 'sales-advisor', label: 'Sales-Advisor' },
  { value: 'part-time', label: 'Part-time' },
]

function getInitialWeek() {
  const currentDate = new Date()
  const firstDay = new Date(currentDate.getFullYear(), 0, 1)
  return Math.ceil((((currentDate - firstDay) / 86400000) + firstDay.getDay() + 1) / 7)
}

function getEffectiveConstraints(constraints) {
  const effective = new Set(constraints)
  constraints.forEach((constraint) => {
    const day = Math.floor(constraint / 10)
    const type = constraint % 10
    if (type === 2) effective.add(day * 10 + 1)
    if (type === 4) effective.add(day * 10 + 3)
  })
  return effective
}

function getEmployeeType(value) {
  const normalizedValue = String(value ?? '').trim().toLowerCase()
  return employeeTypes.some((employeeType) => employeeType.value === normalizedValue)
    ? normalizedValue
    : 'sales-advisor'
}

export default function EmployeeConstraints() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [weekNo, setWeekNo] = useState(String(getInitialWeek()))
  const [constraintMode, setConstraintMode] = useState('default')
  const [constraints, setConstraints] = useState([])
  const [hasSpecificConstraints, setHasSpecificConstraints] = useState(false)
  const [employeeDetails, setEmployeeDetails] = useState({
    name: '',
    keyholder: false,
    employeeType: 'sales-advisor',
    contractHours: '',
    desiredHours: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const effectiveConstraints = useMemo(() => getEffectiveConstraints(constraints), [constraints])

  function selectEmployee(event) {
    setEmployeeId(event.target.value)
    setConstraints([])
    setHasSpecificConstraints(false)
    setEmployeeDetails({ name: '', keyholder: false, employeeType: 'sales-advisor', contractHours: '', desiredHours: '' })
    setMessage('')
    setError('')
  }

  useEffect(() => {
    let cancelled = false
    async function loadEmployees() {
      try {
        const response = await fetch('/api/employees')
        if (!response.ok) throw new Error('Unable to load employees.')
        const data = await response.json()
        if (!cancelled) setEmployees(data.employees ?? [])
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load employees.')
      }
    }

    loadEmployees()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const id = Number(employeeId)
    if (!Number.isInteger(id) || id < 1) return

    let cancelled = false
    async function loadEmployeeDetails() {
      try {
        const response = await fetch(`/api/employeeDetail/${id}`)
        if (!response.ok) throw new Error('Unable to load employee details.')
        const data = await response.json()
        if (!cancelled && data.employee) {
          setEmployeeDetails({
            name: data.employee.name ?? '',
            keyholder: Boolean(data.employee.keyholder),
            employeeType: getEmployeeType(data.employee.employee_type),
            contractHours: data.employee.contract_hours ?? '',
            desiredHours: data.employee.desired_hours ?? '',
          })
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load employee details.')
      }
    }

    loadEmployeeDetails()
    return () => { cancelled = true }
  }, [employeeId])

  useEffect(() => {
    const id = Number(employeeId)
    const week = Number(weekNo)
    if (!Number.isInteger(id) || id < 1 || (constraintMode === 'specific' && (!Number.isInteger(week) || week < 1))) return

    let cancelled = false
    async function loadConstraints() {
      setIsLoading(true)
      setError('')
      setMessage('')
      try {
        if (constraintMode === 'default') {
          const response = await fetch(`/api/defaultEmployeeConstraints/${id}`)
          if (!response.ok && response.status !== 404) throw new Error('Unable to load default constraints.')
          const data = response.ok ? await response.json() : {}

          console.log(data);

          if (!cancelled) {
            setConstraints(data.defaultEmployeeConstraints?.constraint ?? [])
            setHasSpecificConstraints(false)
          }
          return
        }

        const response = await fetch(`/api/specificEmployeeConstraints/${id}/${week}`)
        if (!response.ok) throw new Error('Unable to load specific constraints.')
        const data = await response.json()
        const specificRow = data.specificEmployeeConstraints?.[0]
        if (!cancelled) {
          setConstraints(specificRow?.constraint ?? [])
          setHasSpecificConstraints(Boolean(specificRow))
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load constraints.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadConstraints()
    return () => { cancelled = true }
  }, [constraintMode, employeeId, weekNo])

  function toggleConstraint(day, type) {
    const code = day * 10 + type
    setMessage('')
    setConstraints((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else {
        next.add(code)
        if (type === 2) next.add(day * 10 + 1)
        if (type === 4) next.add(day * 10 + 3)
      }
      return [...next].sort((a, b) => a - b)
    })
  }

  async function saveConstraints(event) {
    event.preventDefault()
    const id = Number(employeeId)
    const week = Number(weekNo)
    if (!Number.isInteger(id) || id < 1 || (constraintMode === 'specific' && (!Number.isInteger(week) || week < 1))) {
      setError(constraintMode === 'specific' ? 'Enter a valid employee record and week number.' : 'Enter a valid employee record.')
      return
    }
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const isSpecific = constraintMode === 'specific'
      const response = await fetch(isSpecific ? `/api/specificEmployeeConstraints/${id}/${week}` : `/api/defaultEmployeeConstraints/${id}`, {
        method: isSpecific ? (hasSpecificConstraints ? 'PUT' : 'POST') : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSpecific ? { id, weekNo: week, constraint: constraints } : { constraint: constraints }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to save constraints.')
      setHasSpecificConstraints(isSpecific)
      setMessage(`${isSpecific ? 'Specific' : 'Default'} constraints saved.`)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save constraints.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveEmployeeDetails(event) {
    event.preventDefault()
    const id = Number(employeeId)
    if (!Number.isInteger(id) || id < 1) {
      setError('Enter a valid employee record.')
      return
    }
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/updateEmployeeDetail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: employeeDetails.name,
          keyholder: employeeDetails.keyholder,
          contractHours: Number(employeeDetails.contractHours),
          desiredHours: Number(employeeDetails.desiredHours),
          employeeType: employeeDetails.employeeType,
        }),
      })
      if (!response.ok) throw new Error('Unable to save employee details.')
      setMessage('Employee details saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save employee details.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="employee-constraints-view">
      <header className="employee-constraints-heading">
        <p className="eyebrow">Rotora</p>
        <h1>Employee Constraints</h1>
        <p>Mark the shifts this employee cannot work.</p>
      </header>

      <div className="employee-selector">
        <label htmlFor="employee-select">Employee</label>
        <select id="employee-select" value={employeeId} onChange={selectEmployee}>
          <option value="">Choose an employee</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
      </div>

      <section className="employee-details-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Employee profile</p><h2>Details</h2></div>
        </div>
        <form className="employee-details-form" onSubmit={saveEmployeeDetails}>
          <label className="keyholder-control">
            <span>Keyholder</span>
            <input disabled={!employeeId || isSaving} type="checkbox" checked={employeeDetails.keyholder} onChange={(event) => setEmployeeDetails({ ...employeeDetails, keyholder: event.target.checked })} />
          </label>
          <label>
            Employee type
            <select disabled={!employeeId || isSaving} value={employeeDetails.employeeType} onChange={(event) => setEmployeeDetails({ ...employeeDetails, employeeType: event.target.value })}>
              {employeeTypes.map((employeeType) => <option key={employeeType.value} value={employeeType.value}>{employeeType.label}</option>)}
            </select>
          </label>
          <label>Contract hours<input disabled={!employeeId || isSaving} type="number" min="0" step="0.5" value={employeeDetails.contractHours} onChange={(event) => setEmployeeDetails({ ...employeeDetails, contractHours: event.target.value })} /></label>
          <label>Desired hours<input disabled={!employeeId || isSaving} type="number" min="0" step="0.5" value={employeeDetails.desiredHours} onChange={(event) => setEmployeeDetails({ ...employeeDetails, desiredHours: event.target.value })} /></label>
          <button className="details-save" disabled={!employeeId || isSaving} type="submit">Save details <span aria-hidden="true">↗</span></button>
        </form>
      </section>

      <form className="constraints-editor" onSubmit={saveConstraints}>

        <div className="constraint-mode-switch" role="tablist" aria-label="Constraint type">
          <button disabled={!employeeId} className={constraintMode === 'default' ? 'active' : ''} onClick={() => setConstraintMode('default')} role="tab" type="button" aria-selected={constraintMode === 'default'}>Default constraint</button>
          <button disabled={!employeeId} className={constraintMode === 'specific' ? 'active' : ''} onClick={() => setConstraintMode('specific')} role="tab" type="button" aria-selected={constraintMode === 'specific'}>Specific constraint</button>
        </div>

        <div className="constraints-controls">
          {constraintMode === 'specific' && <label>
            Week number
            <input disabled={!employeeId} type="number" min="1" value={weekNo} onChange={(event) => setWeekNo(event.target.value)} />
          </label>}
        </div>

        <div className="constraints-status" aria-live="polite">
          {isLoading && <span>Loading schedule...</span>}
          {!isLoading && error && <span className="constraints-error">{error}</span>}
          {!isLoading && !error && message && <span>{message}</span>}
        </div>

        <div className="constraints-schedule" aria-label="Employee unavailable shifts">
          {weekDays.map((day, dayIndex) => {
            const shifts = dayIndex === 6 ? sundayShifts : weekdayShifts
            return (
              <section className="constraint-day" key={day}>
                <div className="constraint-day-heading">
                  <h2>{day}</h2>
                  <span>{dayIndex === 6 ? 'Sunday hours' : 'Weekday hours'}</span>
                </div>
                <div className="constraint-shifts">
                  {shifts.map((shift) => {
                    const code = (dayIndex + 1) * 10 + shift.type
                    const selected = effectiveConstraints.has(code)
                    return (
                      <button className={`constraint-shift ${selected ? 'selected' : ''}`} disabled={!employeeId || isLoading} key={shift.type} onClick={() => toggleConstraint(dayIndex + 1, shift.type)} type="button">
                        <span className="constraint-shift-mark" aria-hidden="true">{selected ? '×' : '+'}</span>
                        <span><strong>{shift.label}</strong><small>{shift.name}</small></span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="constraints-footer">
          <p>{constraints.length} unavailable shift{constraints.length === 1 ? '' : 's'} selected</p>
          <button className="constraints-save" disabled={!employeeId || isLoading || isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save constraints'} <span aria-hidden="true">↗</span>
          </button>
        </footer>
      </form>
    </div>
  )
}