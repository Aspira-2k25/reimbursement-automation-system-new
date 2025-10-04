import React from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.jsx"
import { Toaster, toast } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"

import StudentNavbar from "./Student/components/Navbar"
import StudentDashboard from "./Student/StudentDashboard"
import StudentRequestStatus from "./Student/RequestStatus"
import StudentProfileSettings from "./Student/ProfileSettings"
import { ProfileProvider } from "./Student/ProfileContext"

import FacultyNavbar from "./Faculty/components/Navbar"
import FacultyDashboard from "./Faculty/FacultyDashboard"
import FacultyRequestStatus from "./Faculty/RequestStatus"
import FacultyProfileSettings from "./Faculty/ProfileSettings"
import { ProfileProvider as FacultyProfileProvider } from "./Faculty/ProfileContext"

import CoordinatorNavbar from "./Coordinator/components/Navbar" // Navigation bar for faculty users
import CoordinatorDashboard from "./Coordinator/CoordinatorDashboard" // Manage Students Request page for faculty
import CoordinatorApprovedRequest from "./Coordinator/ApprovedRequest" // Approved Requests of students
import CoordinatorApplyReimbursement from "./Coordinator/ApplyReimbursement" // Main dashboard for faculty
import CoordinatorProfileSettings from "./Coordinator/ProfileSettings" // Profile settings page for faculty

import HODDashboard from "./Hod/HODDashboard" 

import PrincipalDashboard from "./Principal/PrincipalDashboard"

export default function Dashboard() {
  const location = useLocation()
  const { user } = useAuth()

  const PageWrapper = ({ children, type = "fade" }) => {
    const transitions = {
      fade: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
      },
      slide: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
      },
      scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 }
      }
    }

    return (
      <motion.div
        initial={transitions[type].initial}
        animate={transitions[type].animate}
        exit={transitions[type].exit}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    )
  }

  React.useEffect(() => {
    if (location.pathname === "/logout") {
      toast.success("Logged out successfully")
    }
  }, [location.pathname])

  // Toast configuration with frosted glass effect
  // Shared across all roles
  // You can customize the styles as needed
  // Example usage: toast.success("Message")
  // Documentation: https://react-hot-toast.com/docs/toast
  // Frosted glass effect achieved using backdropFilter and semi-transparent background

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

  const userRole = user?.role || "Student"

  // If the URL explicitly targets coordinator routes, render coordinator dashboard directly
  if (location.pathname.startsWith("/dashboard/coordinator")) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, color-mix(in oklab, var(--color-moss-lime) 20%, white) 0%, white 40%)'}}>
        <CoordinatorDashboard />
        <Toaster {...toastConfig} />
      </div>
    )
  }

  // Force Faculty layout when path targets faculty, regardless of user role
  if (location.pathname.startsWith("/dashboard/faculty")) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, color-mix(in oklab, var(--color-moss-lime) 20%, white) 0%, white 40%)'}}>
        <FacultyProfileProvider>
          <FacultyNavbar />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="faculty" element={<PageWrapper><FacultyDashboard /></PageWrapper>} />
              <Route path="faculty/requests" element={<PageWrapper type="slide"><FacultyRequestStatus /></PageWrapper>} />
              <Route path="faculty/profile" element={<PageWrapper type="scale"><FacultyProfileSettings /></PageWrapper>} />
              <Route path="*" element={<Navigate to="faculty" replace />} />
            </Routes>
          </AnimatePresence>
          <Toaster {...toastConfig} />
        </FacultyProfileProvider>
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/hod")) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, color-mix(in oklab, var(--color-moss-lime) 20%, white) 0%, white 40%)'}}>
        <HODDashboard />
        <Toaster {...toastConfig} />
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/principal")) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, color-mix(in oklab, var(--color-moss-lime) 20%, white) 0%, white 40%)'}}>    
        <PrincipalDashboard />
        <Toaster {...toastConfig} />
      </div>
    )
  }

  const getRoutes = (Navbar, Dashboard, RequestStatus, ProfileSettings, Provider = null) => {
    const content = (
      <div className="min-h-screen" style={{background: 'linear-gradient(180deg, color-mix(in oklab, var(--color-moss-lime) 20%, white) 0%, white 40%)'}}>
        <Navbar />

        <AnimatePresence mode="wait">
          <Routes>
            <Route index element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="requests" element={<PageWrapper type="slide"><RequestStatus /></PageWrapper>} />
            <Route path="profile" element={<PageWrapper type="scale"><ProfileSettings /></PageWrapper>} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </AnimatePresence>

        <Toaster {...toastConfig} />
      </div>
    )

    return Provider ? <Provider>{content}</Provider> : content
  }

  switch (userRole) {
    case "Student":
      return getRoutes(StudentNavbar, StudentDashboard, StudentRequestStatus, StudentProfileSettings, ProfileProvider)

    case "Faculty":
      return getRoutes(FacultyNavbar, FacultyDashboard, FacultyRequestStatus, FacultyProfileSettings, FacultyProfileProvider)

      case "Coordinator":
        // Return coordinator dashboard with coordinator-specific components
        // Note: CoordinatorDashboard handles its own internal navigation, so we don't use getRoutes
        // Components: CoordinatorDashboard (includes internal navbar and routing)
        // Data Source: dummydata.js -> coordinatorData section
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
            <CoordinatorDashboard />
            <Toaster {...toastConfig} />
          </div>
        )

       case "HOD":
        // Return HOD dashboard with sidebar-based navigation
        // Note: HODDashboard handles its own internal navigation with collapsible sidebar
        // Components: HODDashboard (includes sidebar, header, and page routing)
        // Data Source: mockData.js -> initialHodData section
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            <HODDashboard />
            <Toaster {...toastConfig} />
          </div>
        )

      case "Principal":
        // Return Principal dashboard with sidebar-based navigation
        // Note: PrincipalDashboard handles its own internal navigation with collapsible sidebar
        // Components: PrincipalDashboard (includes sidebar, header, and page routing)
        // Data Source: mockPrincipalData.js -> initialPrincipalData section
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            <PrincipalDashboard />
            <Toaster {...toastConfig} />
          </div>
        )


    default:
      return getRoutes(StudentNavbar, StudentDashboard, StudentRequestStatus, StudentProfileSettings, ProfileProvider)
  }
}