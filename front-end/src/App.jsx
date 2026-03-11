
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy load pages for code splitting and better performance
const LoginPage = lazy(() => import('./Pages/Login/Login'))
const ResetPasswordPage = lazy(() => import('./Pages/Login/ResetPassword'))
const Dashboard = lazy(() => import('./Pages/Dashboard/Dashboard'))
const ReimbursementForm = lazy(() => import('./Pages/nptel_form/ReimbursementForm'))
const StudentNptelForm = lazy(() => import('./Pages/nptel_form/StudentForm'))
const LandingPage = lazy(() => import('./Pages/Landing_Page/Landing'))
const ViewForm = lazy(() => import('./Pages/nptel_form/ViewForm'))
const EditForm = lazy(() => import('./Pages/nptel_form/EditForm'))

function App() {


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
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/form" element={<ReimbursementForm />} />
          <Route path="/nptel-form/view/:id" element={<ViewForm />} />
          <Route path="/nptel-form/edit/:id" element={<EditForm />} />
          <Route path="/student-form/view/:id" element={<ViewForm />} />
          <Route path="/student-nptel-form" element={<StudentNptelForm />} />
          <Route path="/faculty-nptel-form" element={<ReimbursementForm />} />
          {/* Catch-all route MUST be last */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App




