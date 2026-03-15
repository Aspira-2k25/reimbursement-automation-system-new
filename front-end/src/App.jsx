
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'react-hot-toast'

// Lazy load pages for code splitting and better performance
const LoginPage = lazy(() => import('./Pages/Login/Login'))
const Dashboard = lazy(() => import('./Pages/Dashboard/Dashboard'))
const ReimbursementForm = lazy(() => import('./Pages/nptel_form/ReimbursementForm'))
const StudentNptelForm = lazy(() => import('./Pages/nptel_form/StudentForm'))
const LandingPage = lazy(() => import('./Pages/Landing_Page/Landing'))
const ViewForm = lazy(() => import('./Pages/nptel_form/ViewForm'))
const EditForm = lazy(() => import('./Pages/nptel_form/EditForm'))
const ForgotPassword = lazy(() => import('./Pages/Login/ForgotPassword'))
const ResetPassword = lazy(() => import('./Pages/Login/ResetPassword'))

function App() {
  const toastConfig = {
    position: "top-right",
    toastOptions: {
      style: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#1e293b',
        borderRadius: '16px',
        padding: '16px 20px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      },
      success: {
        iconTheme: {
          primary: '#10b981',
          secondary: '#fff',
        },
      },
      duration: 3000,
    }
  }

  return (


    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/form" element={<ProtectedRoute><ReimbursementForm /></ProtectedRoute>} />
          <Route path="/nptel-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/nptel-form/edit/:id" element={<ProtectedRoute><EditForm /></ProtectedRoute>} />
          <Route path="/faculty-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/faculty-form/edit/:id" element={<ProtectedRoute><EditForm /></ProtectedRoute>} />
          <Route path="/student-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/student-nptel-form" element={<ProtectedRoute><StudentNptelForm /></ProtectedRoute>} />
          <Route path="/faculty-nptel-form" element={<ProtectedRoute><ReimbursementForm /></ProtectedRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Catch-all route MUST be last */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster {...toastConfig} />
      </Suspense>
    </BrowserRouter>
  )
}

export default App




