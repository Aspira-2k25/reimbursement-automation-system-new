import React from 'react'
import HODLayout, { useHODContext } from './pages/HODLayout'
import HomeDashboard from './pages/HomeDashboard'
import ReportsAndAnalytics from './pages/ReportsAndAnalytics'
import DepartmentRoster from './pages/DepartmentRoster'
import ApplyForReimbursement from './pages/ApplyForReimbursement'
import ProfileSettings from './pages/ProfileSettings'
import RequestStatus from './pages/RequestStatus'
import AllDepartmentOverview from './pages/AllDepartmentOverview'

/**
 * HODDashboard - Main entry point for Head of Department dashboard
 * Provides a complete, self-contained module for HOD functionality
 * Includes layout, navigation, and all HOD-specific features
 */
const HODDashboard = () => {
  return (
    <HODLayout>
      <HODContent />
    </HODLayout>
  )
}

/**
 * HODContent - Renders the appropriate page based on active tab
 * Uses context to determine which component to display
 */
const HODContent = () => {
  const { activeTab } = useHODContext()

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard />
      case 'reports':
        return <ReportsAndAnalytics />
      case 'roster':
        return <DepartmentRoster />
      case 'apply':
        return <ApplyForReimbursement />
      case 'request-status':
        return <RequestStatus />
      case 'all-departments':
        return <AllDepartmentOverview />
      case 'profile':
        return <ProfileSettings />
      default:
        return <HomeDashboard />
    }
  }

  return renderContent()
}

export default HODDashboard
