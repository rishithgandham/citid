import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Pages
import App from './pages/App.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Protected from './pages/Protected.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/protected" element={<Protected />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
