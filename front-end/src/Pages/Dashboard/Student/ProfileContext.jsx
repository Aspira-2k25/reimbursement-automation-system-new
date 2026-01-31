import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'

// Create the Profile Context
const ProfileContext = createContext()

// Available departments for dropdown
export const DEPARTMENTS = [
  "Computer Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "CSE AI and ML",
  "CSE Data Science",
  "Information Technology"
]

// LocalStorage key for persisting profile settings
const PROFILE_STORAGE_KEY = 'student_profile_settings'

// Default profile data
const defaultProfile = {
  name: "Student",
  department: "", // Empty by default - user must select
  role: "Student",
  departmentSet: false // Track if user has explicitly set their department
}

/**
 * Profile Provider Component
 * Provides profile state and update functions to child components
 */
export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultProfile, ...parsed }
      }
    } catch (e) {
      console.error('Error loading profile from localStorage:', e)
    }
    return defaultProfile
  })

  // Sync profile with authenticated user data
  useEffect(() => {
    if (user) {
      setProfile(prev => {
        // If department was already set by user, keep it
        // Otherwise use the one from user auth or leave empty
        const savedDept = prev.departmentSet ? prev.department : (user.department || "")
        const isDeptSet = prev.departmentSet || (user.department && user.department !== "")

        return {
          ...prev,
          name: user.name || user.username || prev.name || "User",
          department: savedDept,
          role: user.role || prev.role || "Student",
          email: user.email || null,
          departmentSet: isDeptSet
        }
      })
    }
  }, [user])

  // Persist profile to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        department: profile.department,
        departmentSet: profile.departmentSet
      }))
    } catch (e) {
      console.error('Error saving profile to localStorage:', e)
    }
  }, [profile.department, profile.departmentSet])

  /**
   * Update profile information
   * @param {Object} updates - Profile updates object
   */
  const updateProfile = (updates) => {
    setProfile(prevProfile => {
      const newProfile = {
        ...prevProfile,
        ...updates
      }
      // If department is being updated, mark it as set
      if (updates.department && updates.department !== "") {
        newProfile.departmentSet = true
      }
      return newProfile
    })
  }

  /**
   * Reset profile to default values
   */
  const resetProfile = () => {
    setProfile(prev => ({
      ...defaultProfile,
      name: prev.name, // Keep the name from auth
      role: prev.role,
      email: prev.email
    }))
    localStorage.removeItem(PROFILE_STORAGE_KEY)
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
