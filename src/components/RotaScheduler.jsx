import { Fragment, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../app/auth.js'

const weekDays = [
  { number: 1, name: 'Monday' },
  { number: 2, name: 'Tuesday' },
  { number: 3, name: 'Wednesday' },
  { number: 4, name: 'Thursday' },
  { number: 5, name: 'Friday' },
  { number: 6, name: 'Saturday' },
  { number: 7, name: 'Sunday' },
]

function getInitialWeek() {
  const currentDate = new Date()
  const firstDay = new Date(currentDate.getFullYear(), 0, 1)
  return Math.ceil((((currentDate - firstDay) / 86400000) + firstDay.getDay() + 1) / 7)
}

// day 3 = Wednesday (shorter morning shift), day 7 = Sunday (only two shift types)
function getShiftTime(dayNumber, type) {
  if (dayNumber === 7) return type === 1 ? '09:45-18:15' : type === 2 ? '11:45-20:15' : null
  if (dayNumber === 3) {
    if (type === 1) return '08:00-17:00'
    if (type === 2) return '08:00-14:30'
  }
  if (type === 1) return '09:30-18:30'
  if (type === 2) return '10:00-16:30'
  if (type === 3) return '11:15-20:15'
  if (type === 4) return '13:45-20:15'
  return null
}

function getShiftHours(type) {
  return type === 2 || type === 4 ? 6 : 8
}

function getMondayOfWeek(weekNo) {
  const year = new Date().getFullYear()
  const simple = new Date(year, 0, 1 + (weekNo - 1) * 7)
  const dayOfWeek = simple.getDay()
  const monday = new Date(simple)
  monday.setDate(simple.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return monday
}

function getWeekDates(weekNo) {
  const monday = getMondayOfWeek(weekNo)
  return weekDays.map((_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })
}

function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`
}

function formatLongDate(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
}

// employeeId -> { [dayNumber]: { time, hours } }
function buildAssignments(rota) {
  const assignments = {}
  Object.entries(rota).forEach(([code, ids]) => {
    const numericCode = Number(code)
    const day = Math.floor(numericCode / 10)
    const type = numericCode % 10
    const time = getShiftTime(day, type)
    const hours = getShiftHours(type)
    ;(ids ?? []).forEach((id) => {
      if (id === null) return
      if (!assignments[id]) assignments[id] = {}
      assignments[id][day] = { time, hours }
    })
  })
  return assignments
}

export default function RotaScheduler() {
  const [weekNo, setWeekNo] = useState(String(getInitialWeek()))
  const [rota, setRota] = useState({})
  const [idToName, setIdToName] = useState({})
  const [employeeOrder, setEmployeeOrder] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [draggedId, setDraggedId] = useState(null)

  const week = Number(weekNo)
  const isValidWeek = Number.isInteger(week) && week > 0

  useEffect(() => {
    if (copyStatus === '') return
    const timeoutId = setTimeout(() => setCopyStatus(''), 3000)
    return () => clearTimeout(timeoutId)
  }, [copyStatus])

  useEffect(() => {
    if (!isValidWeek) return
    let cancelled = false
    async function loadRota() {
      setIsLoading(true)
      setError('')
      setMessage('')
      try {
        const response = await apiFetch(`/api/weekRota/${week}`)
        if (response.status === 404) {
          if (!cancelled) {
            setRota({})
            setIdToName({})
            setEmployeeOrder([])
            setMessage('No rota has been generated for this week yet.')
          }
          return
        }
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || 'Unable to load week rota.')
        if (!cancelled) {
          setRota(data.rota ?? {})
          setIdToName(data.idToName ?? {})
          setEmployeeOrder(data.employeeOrder ?? [])
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load week rota.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadRota()
    return () => { cancelled = true }
  }, [week, isValidWeek])

  const weekDates = useMemo(() => (isValidWeek ? getWeekDates(week) : []), [week, isValidWeek])
  const assignments = useMemo(() => buildAssignments(rota), [rota])

  const rows = useMemo(() => {
    // ids in the rota that no longer exist in employee details (deleted employees) go after the current employees
    const knownIds = employeeOrder.filter((id) => idToName[id] !== undefined)
    const deletedIds = Object.keys(assignments)
      .map(Number)
      .filter((id) => idToName[id] === undefined)
    return [
      ...knownIds.map((id) => ({ id, name: idToName[id] })),
      ...deletedIds.map((id) => ({ id, name: '[deleted employee]', deleted: true })),
    ]
    .map((employee) => {
      const employeeAssignments = assignments[employee.id] ?? {}
      const cells = weekDays.map((day) => employeeAssignments[day.number] ?? null)
      const totalHours = cells.reduce((sum, cell) => sum + (cell?.hours ?? 0), 0)
      return { employee, cells, totalHours }
    })
  }, [employeeOrder, idToName, assignments])

  const hasAnyData = rows.some((row) => row.cells.some((cell) => cell !== null))

  function changeWeek(offset) {
    const currentWeek = Number.parseInt(weekNo, 10)
    setWeekNo(String(Math.max(1, Number.isInteger(currentWeek) ? currentWeek + offset : 1)))
  }

  async function regenerate() {
    if (!isValidWeek) {
      setError('Enter a valid week number.')
      return
    }
    setIsRegenerating(true)
    setError('')
    setMessage('')
    try {
      const response = await apiFetch(`/api/regenerateWeekRota/${week}`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to regenerate rota.')
      setRota(data.rota ?? {})
      setIdToName(data.idToName ?? {})
      setEmployeeOrder(data.employeeOrder ?? [])
      setMessage('Rota regenerated.')
    } catch (regenerateError) {
      setError(regenerateError.message || 'Unable to regenerate rota.')
    } finally {
      setIsRegenerating(false)
    }
  }

  function handleDragStart(employeeId) {
    setDraggedId(employeeId)
  }

  function handleDragOver(event, targetId) {
    event.preventDefault()
    if (draggedId === null || draggedId === targetId) return
    setEmployeeOrder((current) => {
      const fromIndex = current.indexOf(draggedId)
      const toIndex = current.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current
      const next = [...current]
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedId)
      return next
    })
  }

  async function handleDragEnd() {
    setDraggedId(null)
    try {
      await apiFetch('/api/employees/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: employeeOrder }),
      })
    } catch {
      setError('Unable to save the new employee order.')
    }
  }

  async function copyToClipboard() {
    // only the inner shift grid (time + hours per day), so it can be pasted straight over an existing spreadsheet template
    const tsv = rows.map((row) => row.cells
      .flatMap((cell) => [cell?.time ?? '', cell?.hours ?? ''])
      .join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <div className="rota-scheduler">
      <header className="scheduler-header">
        <button className="week-arrow" type="button" aria-label="Previous week" disabled={isLoading || isRegenerating} onClick={() => changeWeek(-1)}>‹</button>
        <div className="week-heading">
          <p className="eyebrow">Rotora</p>
          <h1>Week {weekNo}</h1>
          <p>{weekDates.length ? `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])}` : ''}</p>
        </div>
        <button className="week-arrow" type="button" aria-label="Next week" disabled={isLoading || isRegenerating} onClick={() => changeWeek(1)}>›</button>
      </header>

      <div className="schedule-toolbar">
        <p>Rota schedule</p>
        <button className="copy-button" type="button" disabled={!hasAnyData} onClick={copyToClipboard}>
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
        </button>
      </div>

      <div className="constraints-status" aria-live="polite">
        {isLoading && <span>Loading rota...</span>}
        {!isLoading && error && <span className="constraints-error">{error}</span>}
        {!isLoading && !error && message && <span>{message}</span>}
      </div>

      <div className="rota-table-wrapper">
        <table className="rota-table">
          <thead>
            <tr>
              <th className="rota-table-corner" scope="col">{weekNo}</th>
              {weekDays.map((day, index) => (
                <th className="rota-table-day" colSpan={2} scope="col" key={day.number}>
                  <span className="rota-table-date">{weekDates.length ? formatLongDate(weekDates[index]) : ''}</span>
                  <span className="rota-table-dayname">{day.name.toUpperCase()}</span>
                </th>
              ))}
              <th className="rota-table-worked" scope="col">Worked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.employee.id}
                className={draggedId === row.employee.id ? 'rota-row-dragging' : ''}
                draggable={!row.employee.deleted}
                onDragStart={() => handleDragStart(row.employee.id)}
                onDragOver={(event) => handleDragOver(event, row.employee.id)}
                onDragEnd={handleDragEnd}
              >
                <th className="rota-table-employee" scope="row">
                  {!row.employee.deleted && <span className="rota-table-drag-handle" aria-hidden="true">⠿</span>}
                  {row.employee.name}
                </th>
                {row.cells.map((cell, index) => (
                  <Fragment key={weekDays[index].number}>
                    <td className="rota-table-time">{cell?.time ?? ''}</td>
                    <td className="rota-table-hours">{cell?.hours ?? ''}</td>
                  </Fragment>
                ))}
                <td className="rota-table-worked">{row.totalHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="regenerate-button" type="button" disabled={isLoading || isRegenerating} onClick={regenerate}>
        {isRegenerating ? 'Generating...' : 'Re/generate'}
      </button>
    </div>
  )
}
