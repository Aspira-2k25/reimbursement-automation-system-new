
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'
import useDialogFocus from './hooks/useDialogFocus'
import { Toaster, useToasterStore, toast } from 'react-hot-toast'
import { setupToastDeduplication } from './utils/setupToast'

// Initialize toast deduplication across all call sites
setupToastDeduplication()

/**
 * ToastLimitManager prevents duplicate popups and limits visible toasts
 * so the user never sees identical stacked toast messages at the same time.
 */
function ToastLimitManager() {
  const { toasts } = useToasterStore()

  useEffect(() => {
    // 1. Deduplicate by message string
    const seen = new Set()
    toasts.forEach((t) => {
      if (!t.visible) return
      const key = `${t.type}:${typeof t.message === 'function' ? '' : String(t.message)}`
      if (seen.has(key)) {
        toast.dismiss(t.id)
      } else {
        seen.add(key)
      }
    })

    // 2. Limit visible toasts to 2 at a time to prevent popup stacking
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 2)
      .forEach((t) => toast.dismiss(t.id))
  }, [toasts])

  return null
}

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
  useDialogFocus()
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
          <Route path="/form" element={<ProtectedRoute><RoleGuard allowedRoles={['Faculty', 'Coordinator', 'HOD']}><ReimbursementForm /></RoleGuard></ProtectedRoute>} />
          <Route path="/nptel-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/nptel-form/edit/:id" element={<ProtectedRoute><EditForm /></ProtectedRoute>} />
          <Route path="/faculty-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/faculty-form/edit/:id" element={<ProtectedRoute><EditForm /></ProtectedRoute>} />
          <Route path="/student-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
          <Route path="/student-nptel-form" element={<ProtectedRoute><RoleGuard allowedRoles={['Student']}><StudentNptelForm /></RoleGuard></ProtectedRoute>} />
          <Route path="/faculty-nptel-form" element={<ProtectedRoute><RoleGuard allowedRoles={['Faculty', 'Coordinator', 'HOD']}><ReimbursementForm /></RoleGuard></ProtectedRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Catch-all route MUST be last */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastLimitManager />
        <Toaster {...toastConfig} />
      </Suspense>
    </BrowserRouter>
  )
}

export default App



