
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'

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
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/form" element={<ReimbursementForm />} />
          <Route path="/nptel-form/view/:id" element={<ViewForm />} />
          <Route path="/nptel-form/edit/:id" element={<EditForm />} />
          <Route path="/student-nptel-form" element={<StudentNptelForm />} />
          <Route path="/faculty-nptel-form" element={<ReimbursementForm/>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App




