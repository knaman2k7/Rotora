import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../app/auth.js'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdayShifts = [
  { type: 1, label: '10am - 7pm', name: 'Morning · 8 hour', hours: 8 },
  { type: 2, label: '10am - 4pm', name: 'Morning · 6 hour', hours: 6 },
  { type: 3, label: '11am - 8pm', name: 'Evening · 8 hour', hours: 8 },
  { type: 4, label: '2pm - 8pm', name: 'Evening · 6 hour', hours: 6 },
]
const wednesdayShifts = [
  { type: 1, label: '8am - 5pm', name: 'Morning · 8 hour', hours: 8 },
  { type: 2, label: '8am - 2pm', name: 'Morning · 6 hour', hours: 6 },
  { type: 3, label: '11am - 8pm', name: 'Evening · 8 hour', hours: 8 },
  { type: 4, label: '2pm - 8pm', name: 'Evening · 6 hour', hours: 6 },
]
const sundayShifts = [
  { type: 1, label: '9am - 6pm', name: 'Full day · 8 hour', hours: 8 },
  { type: 2, label: '12pm - 6pm', name: 'Part-time · 6 hour', hours: 6 },
]

function getInitialWeek() {
  const currentDate = new Date()
  const firstDay = new Date(currentDate.getFullYear(), 0, 1)
  return Math.ceil((((currentDate - firstDay) / 86400000) + firstDay.getDay() + 1) / 7)
}

function getShifts(dayIndex) {
  return dayIndex === 6 ? sundayShifts : dayIndex === 2 ? wednesdayShifts : weekdayShifts
}

function getShiftCode(dayIndex, type) {
  return (dayIndex + 1) * 10 + type
}

function readStructure(values) {
  return values.reduce((result, value) => {
    const shiftCode = value % 100
    const count = Math.floor(value / 100)
    if (count > 0) result[shiftCode] = count
    return result
  }, {})
}

function readAssignments(values) {
  return values.reduce((result, value) => {
    const shiftCode = Math.floor(value / 100)
    const employeeId = value % 100
    if (!result[shiftCode]) result[shiftCode] = []
    result[shiftCode].push(employeeId)
    return result
  }, {})
}

function getWeekValues(record) {
  return {
    structure: readStructure(record?.week_constraints ?? record?.weekConstraints ?? []),
    assignments: readAssignments(record?.assigned_shifts ?? record?.assignedShifts ?? []),
  }
}

export default function WeekConstraints() {
  const [constraintMode, setConstraintMode] = useState('default')
  const [isAddingSpecificConstraint, setIsAddingSpecificConstraint] = useState(false)
  const [weekNo, setWeekNo] = useState(String(getInitialWeek()))
  const [employees, setEmployees] = useState([])
  const [structure, setStructure] = useState({})
  const [assignments, setAssignments] = useState({})
  const [expandedAssignments, setExpandedAssignments] = useState({})
  const [assignmentSlots, setAssignmentSlots] = useState({})
  const [hasSpecificConstraints, setHasSpecificConstraints] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const totalHours = useMemo(() => Object.entries(structure).reduce((total, [code, count]) => {
    const dayIndex = Math.floor(Number(code) / 10) - 1
    const shift = getShifts(dayIndex).find((item) => item.type === Number(code) % 10)
    return total + (shift?.hours ?? 0) * count
  }, 0), [structure])
  const showSpecificEmptyState = constraintMode === 'specific' && !isAddingSpecificConstraint && !isLoading && !error && Object.keys(structure).length === 0

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeoutId = setTimeout(() => setSaveStatus(''), 5000)
    return () => clearTimeout(timeoutId)
  }, [saveStatus])

  useEffect(() => {
    let cancelled = false
    async function loadEmployees() {
      try {
        const response = await apiFetch('/api/employees')
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
    const week = Number(weekNo)
    if (constraintMode === 'specific' && (!Number.isInteger(week) || week < 1)) return
    let cancelled = false
    async function loadConstraints() {
      setIsLoading(true)
      setError('')
      setMessage('')
      const url = constraintMode === 'default' ? '/api/defaultWeekConstraints' : `/api/specificWeekConstraints/${week}`
      try {
        const response = await apiFetch(url)
        if (!response.ok && !(constraintMode === 'specific' && response.status === 404)) throw new Error('Unable to load week constraints.')
        if (response.status === 404) {
          if (!cancelled) {
            setStructure({})
            setAssignments({})
            setIsAddingSpecificConstraint(false)
            setExpandedAssignments({})
            setAssignmentSlots({})
            setHasSpecificConstraints(false)
            setIsDirty(false)
          }
          return
        }
        const data = await response.json()
        const record = constraintMode === 'default' ? data.defaultWeekConstraints : data.specificWeekConstraints
        const values = getWeekValues(record)
        if (!cancelled) {
          setStructure(values.structure)
          setAssignments(values.assignments)
          setIsAddingSpecificConstraint(false)
          const loadedAssignmentCodes = Object.keys(values.assignments)
          setExpandedAssignments(loadedAssignmentCodes.reduce((result, code) => ({ ...result, [code]: true }), {}))
          setAssignmentSlots(loadedAssignmentCodes.reduce((result, code) => ({ ...result, [code]: values.assignments[code].length }), {}))
          setHasSpecificConstraints(constraintMode === 'specific')
          setIsDirty(false)
          if (data.employees) setEmployees(data.employees)
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load week constraints.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadConstraints()
    return () => { cancelled = true }
  }, [constraintMode, weekNo])

  function changeWeek(offset) {
    const currentWeek = Number.parseInt(weekNo, 10)
    setWeekNo(String(Math.max(1, Number.isInteger(currentWeek) ? currentWeek + offset : 1)))
  }

  function changeCount(shiftCode, offset) {
    setMessage('')
    setIsDirty(true)
    setStructure((current) => {
      const nextCount = Math.max(0, Math.min(9, (current[shiftCode] ?? 0) + offset))
      const next = { ...current }
      if (nextCount === 0) delete next[shiftCode]
      else next[shiftCode] = nextCount
      return next
    })
    setAssignmentSlots((current) => ({ ...current, [shiftCode]: Math.min(current[shiftCode] ?? 0, Math.max(0, (structure[shiftCode] ?? 0) + offset)) }))
    if (offset < 0) {
      setAssignments((current) => ({ ...current, [shiftCode]: (current[shiftCode] ?? []).slice(0, Math.max(0, (structure[shiftCode] ?? 0) - 1)) }))
    }
  }

  function toggleAssignment(shiftCode, employeeId) {
    setMessage('')
    setIsDirty(true)
    setAssignments((current) => {
      const selected = current[shiftCode] ?? []
      if (selected.includes(employeeId)) return { ...current, [shiftCode]: selected.filter((id) => id !== employeeId) }
      if (selected.length >= (structure[shiftCode] ?? 0)) return current
      return { ...current, [shiftCode]: [...selected, employeeId] }
    })
  }

  function toggleEmployeeList(shiftCode) {
    setExpandedAssignments((current) => {
      const isExpanded = !current[shiftCode]
      if (isExpanded) {
        setAssignmentSlots((slots) => ({ ...slots, [shiftCode]: Math.max(1, (assignments[shiftCode] ?? []).length) }))
      }
      return { ...current, [shiftCode]: isExpanded }
    })
  }

  function addEmployeeSlot(shiftCode) {
    setAssignmentSlots((current) => ({ ...current, [shiftCode]: Math.min(structure[shiftCode] ?? 0, (current[shiftCode] ?? 0) + 1) }))
  }

  function selectEmployee(shiftCode, slotIndex, employeeId) {
    setMessage('')
    setIsDirty(true)
    setAssignments((current) => {
      const next = [...(current[shiftCode] ?? [])]
      if (employeeId === '') {
        if (Number.isInteger(next[slotIndex])) next.splice(slotIndex, 1)
      } else next[slotIndex] = Number(employeeId)
      return { ...current, [shiftCode]: next.filter((id) => Number.isInteger(id)) }
    })
    if (employeeId === '' && Number.isInteger((assignments[shiftCode] ?? [])[slotIndex])) {
      setAssignmentSlots((current) => ({ ...current, [shiftCode]: Math.max(0, (current[shiftCode] ?? 0) - 1) }))
    }
  }

  function removeEmployee(shiftCode, slotIndex) {
    setMessage('')
    setIsDirty(true)
    setAssignments((current) => {
      const next = [...(current[shiftCode] ?? [])]
      next.splice(slotIndex, 1)
      return { ...current, [shiftCode]: next }
    })
    setAssignmentSlots((current) => ({ ...current, [shiftCode]: Math.max(0, (current[shiftCode] ?? 0) - 1) }))
  }

  async function saveConstraints(event) {
    event.preventDefault()
    const week = Number(weekNo)
    if (constraintMode === 'specific' && (!Number.isInteger(week) || week < 1)) {
      setError('Enter a valid week number.')
      return
    }
    const weekConstraints = Object.entries(structure).map(([shiftCode, count]) => count * 100 + Number(shiftCode)).sort((a, b) => a - b)
    const assignedShifts = Object.entries(assignments).flatMap(([shiftCode, employeeIds]) => employeeIds.filter((id) => Number.isInteger(id)).map((id) => Number(shiftCode) * 100 + id)).sort((a, b) => a - b)
    const body = { desiredTotalHours: totalHours, weekConstraints, assignedShifts }
    const url = constraintMode === 'default' ? '/api/defaultWeekConstraints' : `/api/specificWeekConstraints/${week}`
    setIsSaving(true)
    setError('')
    setMessage('')
    setSaveStatus('')
    try {
      const response = await apiFetch(url, {
        method: constraintMode === 'specific' && !hasSpecificConstraints ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to save week constraints.')
      setHasSpecificConstraints(constraintMode === 'specific')
      setIsDirty(false)
      setSaveStatus('saved')
      setMessage(`${constraintMode === 'specific' ? 'Specific' : 'Default'} week constraints saved.`)
    } catch (saveError) {
      setSaveStatus('error')
      setError(saveError.message || 'Unable to save week constraints.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteConstraints() {
    const week = Number(weekNo)
    if (!Number.isInteger(week) || week < 1) {
      setError('Enter a valid week number.')
      return
    }
    setIsDeleting(true)
    setError('')
    setMessage('')
    setSaveStatus('')
    try {
      const response = await apiFetch(`/api/specificWeekConstraints/${week}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to delete week constraints.')
      }
      setStructure({})
      setAssignments({})
      setExpandedAssignments({})
      setAssignmentSlots({})
      setIsAddingSpecificConstraint(false)
      setHasSpecificConstraints(false)
      setIsDirty(false)
      setMessage('Specific week constraints deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete week constraints.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="week-constraints-view">
      <header className="employee-constraints-heading">
        <p className="eyebrow">Rotora</p>
        <h1>Week&apos;s Constraints</h1>
        <p>Build the shift structure and reserve shifts for specific employees.</p>
      </header>
      <form className="constraints-editor" onSubmit={saveConstraints}>
        <div className="constraint-mode-switch" role="tablist" aria-label="Constraint type">
          <button className={constraintMode === 'default' ? 'active' : ''} onClick={() => { setIsAddingSpecificConstraint(false); setConstraintMode('default') }} role="tab" type="button" aria-selected={constraintMode === 'default'}>Default constraint</button>
          <button className={constraintMode === 'specific' ? 'active' : ''} onClick={() => { setIsAddingSpecificConstraint(false); setConstraintMode('specific') }} role="tab" type="button" aria-selected={constraintMode === 'specific'}>Specific constraint</button>
        </div>
        {constraintMode === 'specific' && <div className="constraints-controls specific">
          <label>Week number
            <span className="week-number-picker">
              <button className="week-number-arrow" disabled={isLoading} onClick={() => changeWeek(-1)} type="button" aria-label="Previous week">&#8592;</button>
              <input className="week-number-input" inputMode="numeric" type="text" value={weekNo} onChange={(event) => setWeekNo(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} />
              <button className="week-number-arrow" disabled={isLoading} onClick={() => changeWeek(1)} type="button" aria-label="Next week">&#8594;</button>
            </span>
          </label>
        </div>}
        <div className="constraints-status" aria-live="polite">
          {isLoading && <span>Loading week constraints...</span>}
          {!isLoading && error && <span className="constraints-error">{error}</span>}
          {!isLoading && !error && isDirty && <span className="constraints-unsaved">Unsaved changes. Save to keep them.</span>}
          {!isLoading && !error && !isDirty && message && <span className="constraints-saved">{message}</span>}
        </div>
        {showSpecificEmptyState ? <div className="constraints-empty-state">
          <p>Currently no constraint</p>
          <button type="button" onClick={() => setIsAddingSpecificConstraint(true)}>Add constraint +</button>
        </div> : <div className="week-structure-grid">
          {weekDays.map((day, dayIndex) => <section className="week-structure-day" key={day}>
            <div className="constraint-day-heading"><h2>{day}</h2><span>{dayIndex === 6 ? 'Sunday hours' : 'Weekday hours'}</span></div>
            <div className="week-shift-list">
              {getShifts(dayIndex).map((shift) => {
                const code = getShiftCode(dayIndex, shift.type)
                const count = structure[code] ?? 0
                const selectedEmployees = assignments[code] ?? []
                const slotCount = assignmentSlots[code] ?? 0
                return <div className="week-shift-row" key={code}>
                  <div><strong>{shift.label}</strong><small>{shift.name}</small></div>
                  <div className="shift-count-control">
                    <button type="button" disabled={isLoading || count === 0} onClick={() => changeCount(code, -1)} aria-label={`Remove ${shift.name} shift`}>−</button>
                    <output aria-label={`${count} ${shift.name} shifts`}>{count}</output>
                    <button type="button" disabled={isLoading || count === 9} onClick={() => changeCount(code, 1)} aria-label={`Add ${shift.name} shift`}>+</button>
                  </div>
                  {count > 0 && <>
                    {!expandedAssignments[code] && <button className="employee-selection-button" type="button" disabled={isLoading} onClick={() => toggleEmployeeList(code)} aria-label="Add employee to shift">+</button>}
                    {expandedAssignments[code] && <div className="shift-employee-picker">
                      {Array.from({ length: slotCount }, (_, slotIndex) => <div className="employee-select-row" key={`${code}-${slotIndex}`}>
                        <select value={selectedEmployees[slotIndex] ?? ''} disabled={isLoading} onChange={(event) => selectEmployee(code, slotIndex, event.target.value)} aria-label={`Employee ${slotIndex + 1}`}>
                          <option value="">Choose employee</option>
                          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        </select>
                        <button className="remove-employee-button" type="button" disabled={isLoading || !selectedEmployees[slotIndex]} onClick={() => removeEmployee(code, slotIndex)} aria-label="Remove selected employee">×</button>
                      </div>)}
                      {slotCount < count && <button className="employee-selection-button" type="button" disabled={isLoading} onClick={() => addEmployeeSlot(code)} aria-label="Add another employee to shift">+</button>}
                    </div>}
                  </>}
                </div>
              })}
            </div>
          </section>)}
        </div>}
        {!showSpecificEmptyState && <footer className="constraints-footer">
          <span aria-hidden="true" />
          <div className="constraints-footer-center">
            {constraintMode === 'specific' && hasSpecificConstraints && <button className="constraints-delete" disabled={isLoading || isSaving || isDeleting} type="button" onClick={deleteConstraints}>{isDeleting ? 'Deleting...' : 'Delete constraint'}</button>}
          </div>
          <div className="constraints-footer-save">
            {saveStatus === 'saved' && <span className="save-result save-result-success">Saved changes</span>}
            {saveStatus === 'error' && <span className="save-result save-result-error">Could not save changes</span>}
            <button className="constraints-save" disabled={isLoading || isSaving} type="submit">{isSaving ? 'Saving...' : 'Save constraints'} </button>
          </div>
        </footer>}
      </form>
    </div>
  )
}