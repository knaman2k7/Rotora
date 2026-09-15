

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext.jsx'
import AppRoutes from './app/AppRoutes.jsx'
import ServerWakingNotice from './components/ServerWakingNotice.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ServerWakingNotice />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}