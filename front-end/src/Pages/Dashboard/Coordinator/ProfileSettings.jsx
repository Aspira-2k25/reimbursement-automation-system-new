"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"

// Dummy user data
const initialUserData = {
  fullName: "Dr. Sarah Johnson",
  department: "Computer Science",
  designation: "Associate Professor",
  role: "Coordinator",
}

export default function ProfileSettings({ userProfile, setUserProfile }) {
  const [userData, setUserData] = useState(userProfile || initialUserData)
  const [isEditing, setIsEditing] = useState(false)

  // Sync local state when userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      setUserData(userProfile)
    }
  }, [userProfile])

  const handleInputChange = (field, value) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    // Update the parent component's userProfile state
    if (setUserProfile) {
      setUserProfile(userData)
    }
    setIsEditing(false)
    toast.success("Profile updated successfully!")
  }

  const handleReset = () => {
    setUserData(userProfile || initialUserData)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section - Responsive */}
      <div className="text-center px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Faculty Profile Settings
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
          Update your faculty information. Changes reflect across the portal instantly.
        </p>
      </div>

      {/* Profile Form - Responsive */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Full Name - Responsive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Department - Responsive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Designation - Responsive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userData.designation}
                onChange={(e) => handleInputChange("designation", e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Role - Responsive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Role</label>
              <input
                type="text"
                value={userData.role}
                disabled={true}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Role cannot be changed</p>
            </div>

            {/* Action Buttons - Enhanced with better interactions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    RESET
                  </button>
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                  >
                    SAVE CHANGES
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
