import React from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.jsx"
import { toast } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"

import StudentNavbar from "./Student/components/Navbar"
import StudentDashboard from "./Student/StudentDashboard"
import StudentRequestStatus from "./Student/RequestStatus"
import StudentProfileSettings from "./Student/ProfileSettings"
import { ProfileProvider } from "./Student/ProfileContext"
import { NotificationProvider as StudentNotificationProvider } from "./Student/NotificationContext"

import FacultyNavbar from "./Faculty/components/Navbar"
import FacultyDashboard from "./Faculty/FacultyDashboard"
import FacultyRequestStatus from "./Faculty/RequestStatus"
import FacultyProfileSettings from "./Faculty/ProfileSettings"
import { ProfileProvider as FacultyProfileProvider } from "./Faculty/ProfileContext"
import { NotificationProvider as FacultyNotificationProvider } from "./Faculty/NotificationContext"

import CoordinatorNavbar from "./Coordinator/components/Navbar" // Navigation bar for faculty users
import CoordinatorDashboard from "./Coordinator/CoordinatorDashboard" // Manage Students Request page for faculty
import CoordinatorApprovedRequest from "./Coordinator/ApprovedRequest" // Approved Requests of students
import CoordinatorApplyReimbursement from "./Coordinator/ApplyReimbursement" // Main dashboard for faculty
import CoordinatorProfileSettings from "./Coordinator/ProfileSettings" // Profile settings page for faculty
import ChangePassword from "../../components/ChangePassword"

import HODDashboard from "./Hod/HODDashboard"

import PrincipalDashboard from "./Principal/PrincipalDashboard"

import AccountsDashboard from "./Accounts/AccountsDashboard"

import AdminDashboard from "./Admin/AdminDashboard"

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


  const userRole = user?.role || "Student"

  // Admin users are restricted to /dashboard/admin only
  if (userRole === "Admin" && !location.pathname.startsWith("/dashboard/admin")) {
    return <Navigate to="/dashboard/admin" replace />
  }
  // If the URL explicitly targets coordinator routes, render coordinator dashboard directly
  if (location.pathname.startsWith("/dashboard/coordinator")) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #65CCB8 20%, white) 0%, white 40%)' }}>
        <CoordinatorDashboard />
      </div>
    )
  }

  // Force Faculty layout when path targets faculty, regardless of user role
  if (location.pathname.startsWith("/dashboard/faculty")) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #65CCB8 20%, white) 0%, white 40%)' }}>
        <FacultyProfileProvider>
          <FacultyNotificationProvider>
            <FacultyNavbar />
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="faculty" element={<PageWrapper><FacultyDashboard /></PageWrapper>} />
                <Route path="faculty/requests" element={<PageWrapper type="slide"><FacultyRequestStatus /></PageWrapper>} />
                <Route path="faculty/profile" element={<PageWrapper type="scale"><FacultyProfileSettings /></PageWrapper>} />
                <Route path="faculty/change-password" element={<PageWrapper><ChangePassword /></PageWrapper>} />
                <Route path="*" element={<Navigate to="faculty" replace />} />
              </Routes>
            </AnimatePresence>
          </FacultyNotificationProvider>
        </FacultyProfileProvider>
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/hod")) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #65CCB8 20%, white) 0%, white 40%)' }}>
        <HODDashboard />
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/principal")) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #65CCB8 20%, white) 0%, white 40%)' }}>
        <PrincipalDashboard />
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/accounts")) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #F59E0B 15%, white) 0%, white 40%)' }}>
        <AccountsDashboard />
      </div>
    )
  }

  if (location.pathname.startsWith("/dashboard/admin")) {
    // For testing: allow admin dashboard to be accessed without login.
    // Remove or guard this for production.
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #8B5CF6 15%, white) 0%, white 40%)' }}>
        <AdminDashboard />
      </div>
    )
  }

  const getRoutes = (Navbar, Dashboard, RequestStatus, ProfileSettings, Provider = null, NotificationProvider = null) => {
    const content = (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, #65CCB8 20%, white) 0%, white 40%)' }}>
        <Navbar />

        <AnimatePresence mode="wait">
          <Routes>
            <Route index element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="requests" element={<PageWrapper type="slide"><RequestStatus /></PageWrapper>} />
            <Route path="profile" element={<PageWrapper type="scale"><ProfileSettings /></PageWrapper>} />
            {userRole !== "Student" && (
              <Route path="change-password" element={<PageWrapper><ChangePassword /></PageWrapper>} />
            )}
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    )

    let wrappedContent = content
    if (NotificationProvider) {
      wrappedContent = <NotificationProvider>{wrappedContent}</NotificationProvider>
    }
    if (Provider) {
      wrappedContent = <Provider>{wrappedContent}</Provider>
    }
    return wrappedContent
  }

  switch (userRole) {
    case "Student":
      return getRoutes(StudentNavbar, StudentDashboard, StudentRequestStatus, StudentProfileSettings, ProfileProvider, StudentNotificationProvider)

    case "Faculty":
      return getRoutes(FacultyNavbar, FacultyDashboard, FacultyRequestStatus, FacultyProfileSettings, FacultyProfileProvider, FacultyNotificationProvider)

    case "Coordinator":
      // Return coordinator dashboard with coordinator-specific components
      // Components: CoordinatorDashboard (includes internal navbar and routing)
      // Data Source: API calls to backend
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
          <CoordinatorDashboard />
        </div>
      )

    case "HOD":
      // Return HOD dashboard with sidebar-based navigation
      // Note: HODDashboard handles its own internal navigation with collapsible sidebar
      // Components: HODDashboard (includes sidebar, header, and page routing)
      // Data Source: API calls to backend
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
          <HODDashboard />
        </div>
      )

    case "Principal":
      // Return Principal dashboard with sidebar-based navigation
      // Note: PrincipalDashboard handles its own internal navigation with collapsible sidebar
      // Components: PrincipalDashboard (includes sidebar, header, and page routing)
      // Data Source: API calls to backend
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
          <PrincipalDashboard />
        </div>
      )

    case "Accounts":
      // Return Accounts dashboard with sidebar-based navigation
      // Note: AccountsDashboard handles its own internal navigation with collapsible sidebar
      // Components: AccountsDashboard (includes sidebar, header, and page routing)
      // Primary function: Mark approved requests as reimbursed, print forms, filter by department/type/date
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/20">
          <AccountsDashboard />
        </div>
      )

    case "Admin":
      // Return Admin dashboard with sidebar-based navigation
      // Note: AdminDashboard handles its own internal navigation with collapsible sidebar
      // Components: AdminDashboard (includes sidebar, header, and page routing)
      // Primary function: Manage faculty members and departments
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50/30 to-violet-50/20">
          <AdminDashboard />
        </div>
      )

    default:
      return getRoutes(StudentNavbar, StudentDashboard, StudentRequestStatus, StudentProfileSettings, ProfileProvider, StudentNotificationProvider)
  }
}