import { useEffect, useMemo, useState } from 'react'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdayShifts = [
  { type: 1, label: '10am - 7pm', name: 'Morning · 8 hour', isSixHour: false },
  { type: 2, label: '10am - 4pm', name: 'Morning · 6 hour', isSixHour: true },
  { type: 3, label: '11am - 8pm', name: 'Evening · 8 hour', isSixHour: false },
  { type: 4, label: '2pm - 8pm', name: 'Evening · 6 hour', isSixHour: true },
]
const wednesdayShifts = [
  { type: 1, label: '8am - 5pm', name: 'Morning · 8 hour', isSixHour: false },
  { type: 2, label: '8am - 2pm', name: 'Morning · 6 hour', isSixHour: true },
  { type: 3, label: '11am - 8pm', name: 'Evening · 8 hour', isSixHour: false },
  { type: 4, label: '2pm - 8pm', name: 'Evening · 6 hour', isSixHour: true },
]
const sundayShifts = [
  { type: 1, label: '9am - 6pm', name: 'Full day', isSixHour: false },
  { type: 2, label: '12pm - 6pm', name: 'Part-time', isSixHour: true },
]
const employeeTypes = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant-manager', label: 'Assistant-Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'keyholder', label: 'Keyholder' },
  { value: 'sales-advisor', label: 'Sales-Advisor' },
]
const fullTimeEmployeeTypes = new Set(['manager', 'assistant-manager', 'supervisor'])

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

function isValidAnnualLeaveHours(value) {
  if (value === '' || value === null || value === undefined) return false
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0
}

export default function EmployeeConstraints() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [weekNo, setWeekNo] = useState(String(getInitialWeek()))
  const [constraintMode, setConstraintMode] = useState('default')
  const [isAddingSpecificConstraint, setIsAddingSpecificConstraint] = useState(false)
  const [constraints, setConstraints] = useState([])
  const [hasSpecificConstraints, setHasSpecificConstraints] = useState(false)
  const [isAnnualLeave, setIsAnnualLeave] = useState(false)
  const [annualLeaveHours, setAnnualLeaveHours] = useState('')
  const [hasAnnualLeaveHours, setHasAnnualLeaveHours] = useState(false)
  const [employeeDetails, setEmployeeDetails] = useState({
    name: '',
    keyholder: false,
    employeeType: 'sales-advisor',
    contractHours: '',
    desiredHours: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const effectiveConstraints = useMemo(() => getEffectiveConstraints(constraints), [constraints])
  const isFullTimeEmployee = fullTimeEmployeeTypes.has(employeeDetails.employeeType)
  const showSpecificEmptyState = constraintMode === 'specific' && !isAddingSpecificConstraint && !isLoading && !error && constraints.length === 0

  function selectEmployee(event) {
    setEmployeeId(event.target.value)
    setIsAddingSpecificConstraint(false)
    setConstraints([])
    setHasSpecificConstraints(false)
    setIsAnnualLeave(false)
    setAnnualLeaveHours('')
    setHasAnnualLeaveHours(false)
    setIsDirty(false)
    setEmployeeDetails({ name: '', keyholder: false, employeeType: 'sales-advisor', contractHours: '', desiredHours: '' })
    setMessage('')
    setError('')
  }

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeoutId = setTimeout(() => setSaveStatus(''), 5000)
    return () => clearTimeout(timeoutId)
  }, [saveStatus])

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
            setConstraints(data.defaultEmployeeConstraints?.constraints ?? [])
            setIsAddingSpecificConstraint(false)
            setHasSpecificConstraints(false)
            setIsAnnualLeave(false)
            setAnnualLeaveHours('')
            setHasAnnualLeaveHours(false)
            setIsDirty(false)
          }
          return
        }

        const response = await fetch(`/api/specificEmployeeConstraints/${id}/${week}`)
        if (!response.ok) throw new Error('Unable to load specific constraints.')
        const data = await response.json()
        const specificRow = data.specificEmployeeConstraints?.[0]

        const annualLeaveResponse = await fetch(`/api/annualLeaveHours/${id}/${week}`)
        const annualLeaveRow = annualLeaveResponse.ok ? (await annualLeaveResponse.json()).annualLeaveHours : null

        if (!cancelled) {
          setConstraints(specificRow?.constraints ?? [])
          setIsAddingSpecificConstraint(false)
          setHasSpecificConstraints(Boolean(specificRow))
          setIsAnnualLeave(Boolean(annualLeaveRow))
          setAnnualLeaveHours(annualLeaveRow ? String(annualLeaveRow.hours) : '')
          setHasAnnualLeaveHours(Boolean(annualLeaveRow))
          setIsDirty(false)
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
    setIsDirty(true)
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

  function changeWeek(offset) {
    const currentWeek = Number.parseInt(weekNo, 10)
    const nextWeek = Number.isInteger(currentWeek) ? currentWeek + offset : 1
    setWeekNo(String(Math.max(1, nextWeek)))
  }

  async function saveConstraints(event) {
    event.preventDefault()
    const id = Number(employeeId)
    const week = Number(weekNo)
    if (!Number.isInteger(id) || id < 1 || (constraintMode === 'specific' && (!Number.isInteger(week) || week < 1))) {
      setError(constraintMode === 'specific' ? 'Enter a valid employee record and week number.' : 'Enter a valid employee record.')
      return
    }
    const isSpecific = constraintMode === 'specific'
    if (isSpecific && isAnnualLeave && !isValidAnnualLeaveHours(annualLeaveHours)) {
      setError('Enter a valid number of working hours for annual leave.')
      return
    }
    setIsSaving(true)
    setError('')
    setMessage('')
    setSaveStatus('')
    try {
      const specificUrl = `/api/specificEmployeeConstraints/${id}/${week}`
      const shouldDeleteSpecificConstraints = isSpecific && hasSpecificConstraints && constraints.length === 0
      const response = await fetch(isSpecific ? specificUrl : `/api/defaultEmployeeConstraints/${id}`, shouldDeleteSpecificConstraints ? {
        method: 'DELETE',
      } : {
        method: isSpecific ? (hasSpecificConstraints ? 'PUT' : 'POST') : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSpecific ? { id, weekNo: week, constraint: constraints } : { constraint: constraints }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to save constraints.')
      setHasSpecificConstraints(isSpecific && !shouldDeleteSpecificConstraints)

      if (isSpecific) {
        const annualLeaveUrl = `/api/annualLeaveHours/${id}/${week}`
        if (isAnnualLeave) {
          const annualLeaveResponse = await fetch(annualLeaveUrl, {
            method: hasAnnualLeaveHours ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hours: Number(annualLeaveHours) }),
          })
          const annualLeaveData = await annualLeaveResponse.json().catch(() => ({}))
          if (!annualLeaveResponse.ok) throw new Error(annualLeaveData.message || 'Unable to save annual leave hours.')
          setHasAnnualLeaveHours(true)
        } else if (hasAnnualLeaveHours) {
          const annualLeaveResponse = await fetch(annualLeaveUrl, { method: 'DELETE' })
          if (!annualLeaveResponse.ok && annualLeaveResponse.status !== 404) throw new Error('Unable to remove annual leave hours.')
          setHasAnnualLeaveHours(false)
        }
      }

      setIsDirty(false)
      setSaveStatus('saved')
      setMessage(`${isSpecific ? 'Specific' : 'Default'} constraints saved.`)
    } catch (saveError) {
      setSaveStatus('error')
      setError(saveError.message || 'Unable to save constraints.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteConstraints() {
    const id = Number(employeeId)
    const week = Number(weekNo)
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(week) || week < 1) {
      setError('Enter a valid employee record and week number.')
      return
    }
    setIsDeleting(true)
    setError('')
    setMessage('')
    setSaveStatus('')
    try {
      const response = await fetch(`/api/specificEmployeeConstraints/${id}/${week}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to delete constraints.')
      }
      setConstraints([])
      setIsAddingSpecificConstraint(false)
      setHasSpecificConstraints(false)
      setIsDirty(false)
      setMessage('Specific constraints deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete constraints.')
    } finally {
      setIsDeleting(false)
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
          desiredHours: isFullTimeEmployee ? 0 : Number(employeeDetails.desiredHours),
          employeeType: employeeDetails.employeeType,
        }),
      })
      if (!response.ok) throw new Error('Unable to save employee details.')
      setIsDirty(false)
      setSaveStatus('saved')
      setMessage('Employee details saved.')
    } catch (saveError) {
      setSaveStatus('error')
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
          <label>
            Employee type
            <select disabled={!employeeId || isSaving} value={employeeDetails.employeeType} onChange={(event) => { setIsDirty(true); setEmployeeDetails({ ...employeeDetails, employeeType: event.target.value }) }}>
              {employeeTypes.map((employeeType) => <option key={employeeType.value} value={employeeType.value}>{employeeType.label}</option>)}
            </select>
          </label>
          <label className="keyholder-control">
            <span>Keyholder</span>
            <input disabled={!employeeId || isSaving} type="checkbox" checked={employeeDetails.keyholder} onChange={(event) => { setIsDirty(true); setEmployeeDetails({ ...employeeDetails, keyholder: event.target.checked }) }} />
          </label>
          <label>Contract hours<input disabled={!employeeId || isSaving} type="number" min="0" step="0.5" value={employeeDetails.contractHours} onChange={(event) => { setIsDirty(true); setEmployeeDetails({ ...employeeDetails, contractHours: event.target.value }) }} /></label>
          {!isFullTimeEmployee && (
            <label>Desired hours<input disabled={!employeeId || isSaving} type="number" min="0" step="0.5" value={employeeDetails.desiredHours} onChange={(event) => { setIsDirty(true); setEmployeeDetails({ ...employeeDetails, desiredHours: event.target.value }) }} /></label>
          )}

          <button className="details-save" disabled={!employeeId || isSaving} type="submit">Save details </button>
        </form>
      </section>

      <form className="constraints-editor" onSubmit={saveConstraints}>

        <div className="constraint-mode-switch" role="tablist" aria-label="Constraint type">
          <button disabled={!employeeId} className={constraintMode === 'default' ? 'active' : ''} onClick={() => setConstraintMode('default')} role="tab" type="button" aria-selected={constraintMode === 'default'}>Default constraint</button>
          <button disabled={!employeeId} className={constraintMode === 'specific' ? 'active' : ''} onClick={() => { setIsAddingSpecificConstraint(false); setConstraintMode('specific') }} role="tab" type="button" aria-selected={constraintMode === 'specific'}>Specific constraint</button>
        </div>

        <br/>

        <div className={`constraints-controls ${constraintMode === 'specific' ? 'specific' : ''}`}>
          {constraintMode === 'specific' && <label>
            Week number
            <span className="week-number-picker">
              <button className="week-number-arrow" disabled={!employeeId || isLoading} onClick={() => changeWeek(-1)} type="button" aria-label="Previous week">&#8592;</button>
              <input className="week-number-input" disabled={!employeeId} inputMode="numeric" type="text" value={weekNo} onChange={(event) => setWeekNo(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} />
              <button className="week-number-arrow" disabled={!employeeId || isLoading} onClick={() => changeWeek(1)} type="button" aria-label="Next week">&#8594;</button>
            </span>
          </label>}

          {constraintMode === 'specific' && <label className="annual-leave-toggle">
            <span>Annual leave</span>
            <input
              type="checkbox"
              disabled={!employeeId || isLoading}
              checked={isAnnualLeave}
              onChange={(event) => { setIsDirty(true); setIsAnnualLeave(event.target.checked) }}
            />
          </label>}

          {constraintMode === 'specific' && isAnnualLeave && <label>
            Working hours
            <input
              type="number"
              min="0"
              step="1"
              disabled={!employeeId || isLoading}
              value={annualLeaveHours}
              onChange={(event) => { setIsDirty(true); setAnnualLeaveHours(event.target.value) }}
            />
          </label>}
        </div>

        <div className="constraints-status" aria-live="polite">
          {isLoading && <span>Loading schedule...</span>}
          {!isLoading && error && <span className="constraints-error">{error}</span>}
          {!isLoading && !error && isDirty && <span className="constraints-unsaved">Unsaved changes. Save to keep them.</span>}
          {!isLoading && !error && !isDirty && message && <span className="constraints-saved">{message}</span>}
        </div>

        {showSpecificEmptyState ? <div className="constraints-empty-state">
          <p>Currently no constraint</p>
          <button type="button" onClick={() => setIsAddingSpecificConstraint(true)}>Add constraint +</button>
        </div> : <div className="constraints-schedule" aria-label="Employee unavailable shifts">
          {weekDays.map((day, dayIndex) => {
            const shifts = (dayIndex === 6 ? sundayShifts : dayIndex === 2 ? wednesdayShifts : weekdayShifts)
              .filter((shift) => !isFullTimeEmployee || !shift.isSixHour)
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
        </div>}

        {!showSpecificEmptyState && <footer className="constraints-footer">
          <span aria-hidden="true" />
          <div className="constraints-footer-center">
            {constraintMode === 'specific' && hasSpecificConstraints && <button className="constraints-delete" disabled={isLoading || isSaving || isDeleting} type="button" onClick={deleteConstraints}>{isDeleting ? 'Deleting...' : 'Delete constraint'}</button>}
          </div>
          <div className="constraints-footer-save">
            {saveStatus === 'saved' && <span className="save-result save-result-success">Saved changes</span>}
            {saveStatus === 'error' && <span className="save-result save-result-error">Could not save changes</span>}
            <button className="constraints-save" disabled={!employeeId || isLoading || isSaving} type="submit">
              {isSaving ? 'Saving...' : 'Save constraints'}
            </button>
          </div>
        </footer>}
      </form>
    </div>
  )
}