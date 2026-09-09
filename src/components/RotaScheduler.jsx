const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function RotaScheduler() {
  return (
    <div className="rota-scheduler">
      <header className="scheduler-header">
        <button className="week-arrow" type="button" aria-label="Previous week">‹</button>
        <div className="week-heading">
          <p className="eyebrow">Rotora</p>
          <h1>Week 34</h1>
          <p>9/14/26 - 10/19/26</p>
        </div>
        <button className="week-arrow" type="button" aria-label="Next week">›</button>
      </header>

      <div className="schedule-toolbar">
        <p>Employee constraints</p>
        <button className="copy-button" type="button">Copy</button>
      </div>

      <div className="empty-schedule-board" aria-label="Empty employee constraints schedule">
        <div className="schedule-day-labels">
          {weekDays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="schedule-grid" aria-hidden="true">
          {Array.from({ length: 49 }, (_, index) => <span key={index} />)}
        </div>
      </div>

      <button className="regenerate-button" type="button">Re-generate</button>
    </div>
  )
}