import { useState } from 'react'
import { useAuth } from '../app/useAuth.js'
import EmployeeConstraints from '../components/EmployeeConstraints.jsx'
import RotaScheduler from '../components/RotaScheduler.jsx'
import WeekConstraints from '../components/WeekConstraints.jsx'

export default function DashboardPage() {
  const { logout } = useAuth()
  const [activeView, setActiveView] = useState('scheduler')

  return (
    <main className="scheduler-shell">
      <aside className="scheduler-sidebar">
        <div className="scheduler-logo">ROTORA</div>
        <nav className="scheduler-nav" aria-label="Scheduler navigation">
          <button className={`scheduler-nav-item ${activeView === 'scheduler' ? 'active' : ''}`} type="button" onClick={() => setActiveView('scheduler')}>Rotora Scheduler</button>
          <button className={`scheduler-nav-item ${activeView === 'constraints' ? 'active' : ''}`} type="button" onClick={() => setActiveView('constraints')}>Employee Constraints</button>
          <button className={`scheduler-nav-item ${activeView === 'week-constraints' ? 'active' : ''}`} type="button" onClick={() => setActiveView('week-constraints')}>Week&apos;s Constraints</button>
        </nav>
        <button className="scheduler-logout" type="button" onClick={logout}>Log out</button>
      </aside>

      <section className="scheduler-content">
        {activeView === 'scheduler' ? <RotaScheduler /> : activeView === 'constraints' ? <EmployeeConstraints /> : <WeekConstraints />}
      </section>
    </main>
  )
}