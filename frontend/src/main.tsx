import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Pages
import App from './pages/App.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Apps from './pages/Apps.tsx'
import AppAccess from './pages/AppAccess.tsx'
import UserManagement from './pages/UserManagement.tsx'
import VerifyPending from './pages/VerifyPending.tsx'
import { AuthProvider } from './context/AuthContext.tsx'




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<App />} >
            <Route path="/" element={<Dashboard />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/apps/:appId" element={<AppAccess />} />
            <Route path="/user-management" element={<UserManagement />} />
          </Route>
          <Route path="/verify-pending" element={<VerifyPending />} />

          <Route path="/login"  element={<Login />} />
          <Route path="/authorize"  element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
