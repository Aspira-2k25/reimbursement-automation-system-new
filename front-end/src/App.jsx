
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy load pages for code splitting and better performance
const LoginPage = lazy(() => import('./Pages/Login/Login'))
const Dashboard = lazy(() => import('./Pages/Dashboard/Dashboard'))
const ReimbursementForm = lazy(() => import('./Pages/nptel_form/ReimbursementForm'))
const StudentNptelForm = lazy(() => import('./Pages/nptel_form/StudentForm'))
const LandingPage = lazy(() => import('./Pages/Landing_Page/Landing'))
const ViewForm = lazy(() => import('./Pages/nptel_form/ViewForm'))
const EditForm = lazy(() => import('./Pages/nptel_form/EditForm'))

function App() {


  return (


    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes - require authentication */}
            <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/form" element={<ProtectedRoute><ReimbursementForm /></ProtectedRoute>} />
            <Route path="/nptel-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
            <Route path="/nptel-form/edit/:id" element={<ProtectedRoute><EditForm /></ProtectedRoute>} />
            <Route path="/student-form/view/:id" element={<ProtectedRoute><ViewForm /></ProtectedRoute>} />
            <Route path="/student-nptel-form" element={<ProtectedRoute><StudentNptelForm /></ProtectedRoute>} />
            <Route path="/faculty-nptel-form" element={<ProtectedRoute><ReimbursementForm /></ProtectedRoute>} />
            
            {/* Role-specific routes with RoleGuard */}
            <Route 
              path="/dashboard/coordinator/*" 
              element={
                <RoleGuard allowedRoles={['Coordinator', 'Principal']}>
                  <Dashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/dashboard/hod/*" 
              element={
                <RoleGuard allowedRoles={['HOD', 'Principal']}>
                  <Dashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/dashboard/principal/*" 
              element={
                <RoleGuard allowedRoles={['Principal']}>
                  <Dashboard />
                </RoleGuard>
              } 
            />
            <Route 
              path="/dashboard/accounts/*" 
              element={
                <RoleGuard allowedRoles={['Accounts', 'Principal']}>
                  <Dashboard />
                </RoleGuard>
              } 
            />
            
            {/* Catch-all route MUST be last */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
