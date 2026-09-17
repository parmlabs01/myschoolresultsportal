import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Auth from './pages/Auth'
import DashboardLayout from './pages/school/DashboardLayout'
import Dashboard from './pages/school/Dashboard'
import Students from './pages/school/Students'
import Results from './pages/school/Results'
import BulkUpload from './pages/school/BulkUpload'
import Setup from './pages/school/Setup'
import Profile from './pages/school/Profile'
import Settings from './pages/school/Settings'
import PinsPlaceholder from './pages/school/PinsPlaceholder'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/school"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="results" element={<Results />} />
            <Route path="upload" element={<BulkUpload />} />
            <Route path="setup" element={<Setup />} />
            <Route path="pins" element={<PinsPlaceholder />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* /admin/* lands in Phase 5 */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
