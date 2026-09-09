export default function EmployeeConstraints() {
  return (
    <div className="employee-constraints-view">
      <header className="employee-constraints-heading">
        <p className="eyebrow">Rotora</p>
        <h1>Employee Constraints</h1>
        <p>Add employee availability and scheduling limits here.</p>
      </header>

      <div className="constraints-empty-state">
        <p>No employee constraints added yet.</p>
      </div>
    </div>
  )
}