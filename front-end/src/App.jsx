
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './Pages/Login/Login'
import Dashboard from './Pages/Dashboard/Dashboard'
import ReimbursementForm from './Pages/nptel_form/ReimbursementForm'
import StudentNptelForm from './Pages/nptel_form/StudentForm'

function App() {


  return (

    // <>
    //   <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    //     <LoginPage />
    //   </GoogleOAuthProvider>
    // </>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/form" element={<ReimbursementForm />} />
        <Route path="/student-nptel-form" element={<StudentNptelForm />} />
        <Route path="/faculty-nptel-form" element={<ReimbursementForm/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App