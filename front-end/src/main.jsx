import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {GoogleOAuthProvider} from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext.jsx'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const appTree = (
  <AuthProvider>
    <App />
  </AuthProvider>
)

if (!clientId) {
  console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google login is disabled.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        {appTree}
      </GoogleOAuthProvider>
    ) : appTree}
  </StrictMode>,
)
