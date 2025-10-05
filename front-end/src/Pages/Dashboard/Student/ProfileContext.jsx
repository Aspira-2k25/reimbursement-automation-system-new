import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'

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
  const { user } = useAuth()
  const [profile, setProfile] = useState(defaultProfile)

  // Sync profile with authenticated user data
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || user.username || "User",
        department: user.department || "Computer Science",
        role: user.role || "Student",
        email: user.email || null
      })
    }
  }, [user])

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
