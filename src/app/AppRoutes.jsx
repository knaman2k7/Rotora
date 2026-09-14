import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import ProtectedRoute from './ProtectedRoute.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import AddEmployeePage from '../pages/AddEmployeePage.jsx'

function HomeRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees/new" element={<AddEmployeePage />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}