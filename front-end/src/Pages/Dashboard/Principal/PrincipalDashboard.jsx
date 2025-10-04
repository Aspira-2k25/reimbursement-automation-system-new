import React from 'react'
import PrincipalLayout, { usePrincipalContext } from './pages/PrincipalLayout'
import HomeDashboard from './pages/HomeDashboard'
import ReportsAndAnalytics from './pages/ReportsAndAnalytics'
import DepartmentRoster from './pages/DepartmentRoster'
import ProfileSettings from './pages/ProfileSettings'

/**
 * PrincipalDashboard - Main entry point for Principal dashboard
 * Provides a complete, self-contained module for Principal functionality
 * Includes layout, navigation, and all Principal-specific features
 */
const PrincipalDashboard = () => {
  return (
    <PrincipalLayout>
      <PrincipalContent />
    </PrincipalLayout>
  )
}

/**
 * PrincipalContent - Renders the appropriate page based on active tab
 * Uses context to determine which component to display
 */
const PrincipalContent = () => {
  const { activeTab } = usePrincipalContext()

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard />
      case 'reports':
        return <ReportsAndAnalytics />
      case 'roster':
        return <DepartmentRoster />
      case 'profile':
        return <ProfileSettings />
      default:
        return <HomeDashboard />
    }
  }

  return renderContent()
}

export default PrincipalDashboard
