import React, { createContext, useContext, useState } from 'react'

// Create the Profile Context
const ProfileContext = createContext()

// Default profile data
const defaultProfile = {
  name: "Student",
  department: "Computer Science",
  role: "Student"
}

/**
 * Profile Provider Component
 * Provides profile state and update functions to child components
 */
export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile)

  /**
   * Update profile information
   * @param {Object} updates - Profile updates object
   */
  const updateProfile = (updates) => {
    setProfile(prevProfile => ({
      ...prevProfile,
      ...updates
    }))
  }

  /**
   * Reset profile to default values
   */
  const resetProfile = () => {
    setProfile(defaultProfile)
  }

  const value = {
    profile,
    updateProfile,
    resetProfile
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

/**
 * Custom hook to use profile context
 * @returns {Object} Profile context value
 */
export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
