import ChangeUsername from '../../../components/ChangeUsername'
"use client"

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast"
import { authAPI } from "../../../services/api"
import { useAuth } from "../../../context/AuthContext"

// Default user profile fallback (overwritten by actual user data)
const initialUserData = {
  fullName: "Coordinator",
  department: "",
  designation: "Class Coordinator",
  role: "Coordinator",
}

export default function ProfileSettings({ userProfile, setUserProfile }) {
  const [userData, setUserData] = useState(userProfile || initialUserData)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()

  // Sync local state when userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      setUserData(userProfile)
    }
  }, [userProfile])

  const handleInputChange = (field, value) => {
    if (field !== 'fullName') return;
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const name = userData.fullName.trim()
      if (!name) throw new Error("Full name is required.")
      const result = await authAPI.updateProfile({ name })
      if (!result?.user) throw new Error("Server did not return the saved profile.")
      const saved = { ...userData, fullName: result.user.name, department: result.user.department, role: result.user.role }
      setUserData(saved)
      setUserProfile?.(saved)
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { ...user, ...result.user } }))
      setIsEditing(false)
      toast.success("Profile saved.")
    } catch (error) {
      toast.error(error.message || "Failed to save profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setUserData(userProfile || initialUserData)
    setIsEditing(false)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header Section - Responsive */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900">
          Coordinator Profile Settings
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600">
          Update your name. Department, designation and role are managed by an administrator.
        </p>
      </div>

      {/* Profile Form - Responsive */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">Keep your display name up to date.</p>
          <div className="space-y-4 sm:space-y-6">
            {/* Full Name - Responsive */}
            <div>
              <label htmlFor="coordinator-full-name" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input id="coordinator-full-name"
                type="text"
                value={userData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                disabled={!isEditing || isSaving}
                maxLength={100}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Department - Responsive */}
            <div>
              <label htmlFor="coordinator-department" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <input id="coordinator-department"
                type="text"
                value={userData.department}
                readOnly
                disabled
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Designation - Responsive */}
            <div>
              <label htmlFor="coordinator-designation" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              <input id="coordinator-designation"
                type="text"
                value={userData.designation}
                readOnly
                disabled
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Role - Responsive */}
            <div>
              <label htmlFor="coordinator-role" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Role</label>
              <input id="coordinator-role"
                type="text"
                value={userData.role}
                disabled={true}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Role cannot be changed</p>
            </div>

            {/* Action Buttons - Enhanced with better interactions */}
            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-5">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 active:bg-teal-800 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 active:bg-teal-800 transition-all duration-200 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
              </div>
        </section>
        <ChangeUsername />
      </div>
    </main>
  )
}
