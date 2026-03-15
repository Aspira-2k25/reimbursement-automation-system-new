import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { resolveDepartment } from '../../../utils/departmentResolver'

// Create the Profile Context
const ProfileContext = createContext()

// LocalStorage key for persisting profile settings
const PROFILE_STORAGE_KEY = 'student_profile_settings'

// Default profile data
const defaultProfile = {
  name: "Student",
  department: "",
  role: "Student",
  departmentSet: false
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
    } catch {
      // Silently handle localStorage errors
    }
    return defaultProfile
  })

  // Sync profile with authenticated user data
  useEffect(() => {
    if (user) {
      setProfile(prev => {
        // Keep user-selected department if explicitly set; otherwise prefill from auth session.
        const nextDepartment = prev.departmentSet
          ? prev.department
          : resolveDepartment(user.department, prev.department)
        const isDepartmentSet = prev.departmentSet || Boolean(nextDepartment)

        // If user previously customized their name, keep it
        // Otherwise use the Google/auth name
        const savedName = prev.nameCustomized
          ? prev.name
          : (user.name || user.username || prev.name || "User")

        return {
          ...prev,
          name: savedName,
          department: nextDepartment,
          role: user.role || prev.role || "Student",
          email: user.email || null,
          departmentSet: isDepartmentSet,
        }
      })
    }
  }, [user])

  // Persist profile to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        name: profile.name,
        nameCustomized: profile.nameCustomized || false,
        department: profile.department,
        departmentSet: profile.departmentSet || false,
      }))
    } catch {
      // Silently handle localStorage errors
    }
  }, [profile.name, profile.nameCustomized, profile.department, profile.departmentSet])

  /**
   * Update profile information
   * @param {Object} updates - Profile updates object
   */
  const updateProfile = (updates) => {
    setProfile(prevProfile => {
      const next = {
        ...prevProfile,
        ...updates,
      }
      if (updates.department && updates.department !== '') {
        next.departmentSet = true
      }
      return next
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
