import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reviews from './pages/Reviews'
import CompetitorAnalytics from './pages/CompetitorAnalytics'
import Locations from './pages/Locations'
import Citations from './pages/Citations'
import QAManager from './pages/QAManager'
import MediaManager from './pages/MediaManager'
import ProfileSettings from './pages/ProfileSettings'
import PlanUpgrade from './pages/PlanUpgrade'
import Reports from './pages/Reports'
import ActivityLog from './pages/ActivityLog'
import LocationDetail from './pages/LocationDetail'
import PublicReview from './pages/PublicReview'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import LandingPage from './pages/LandingPage'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/home" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <TenantProvider>
          <Routes>
            <Route path="/home" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/r/:slug" element={<PublicReview />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="competitors" element={<CompetitorAnalytics />} />
              <Route path="locations" element={<Locations />} />
              <Route path="locations/:id" element={<LocationDetail />} />
              <Route path="citations" element={<Citations />} />
              <Route path="qa" element={<QAManager />} />
              <Route path="media" element={<MediaManager />} />
              <Route path="settings" element={<ProfileSettings />} />
              <Route path="plan" element={<PlanUpgrade />} />
              <Route path="reports" element={<Reports />} />
              <Route path="activity" element={<ActivityLog />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TenantProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
