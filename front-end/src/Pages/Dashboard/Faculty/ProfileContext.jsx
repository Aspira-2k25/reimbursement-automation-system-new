import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'

// Create the Profile Context
const ProfileContext = createContext()

// Default profile data for Faculty (overwritten by actual user data from auth)
const defaultProfile = {
  name: "Faculty",
  department: "",
  designation: "",
  role: "Faculty"
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
        name: user.name || user.username || "Faculty",
        department: user.department || "",
        designation: user.designation || "",
        role: user.role || "Faculty",
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
    console.warn('useProfile used outside a ProfileProvider - returning safe default')
    return {
      profileData: {
        name: '',
        facultyId: '',
        designation: '',
        department: '',
        email: ''
      },
      updateProfileData: () => { },
      isProfileComplete: false
    }
  }
  return context
}
