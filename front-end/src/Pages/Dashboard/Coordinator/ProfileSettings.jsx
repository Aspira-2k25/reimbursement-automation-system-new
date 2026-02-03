"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "react-hot-toast"
import { authAPI } from '../../../services/api' 

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

  // Change password state & handlers
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [pwdLoading, setPwdLoading] = useState(false)

  const toggleShowChangePassword = useCallback(() => setShowChangePassword(s => !s), [])

  const handlePasswordInputChange = useCallback((field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: '' }))
  }, [passwordErrors])

  const validatePasswordForm = useCallback(() => {
    const errs = {}
    if (!passwordForm.oldPassword) errs.oldPassword = 'Old password is required'
    if (!passwordForm.newPassword) errs.newPassword = 'New password is required'
    else if (passwordForm.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters long'
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setPasswordErrors(errs)
    return Object.keys(errs).length === 0
  }, [passwordForm])

  const handleSubmitPassword = useCallback(async () => {
    if (!validatePasswordForm()) {
      toast.error('Please fix the errors before saving')
      return
    }
    setPwdLoading(true)
    try {
      await authAPI.changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword })
      toast.success('Password changed successfully')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePassword(false)
    } catch (e) {
      toast.error(e?.error || e?.message || 'Failed to change password')
    } finally {
      setPwdLoading(false)
    }
  }, [passwordForm, validatePasswordForm])

  const handleCancelChangePassword = useCallback(() => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordErrors({})
    setShowChangePassword(false)
  }, [])

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
            {/* Security Settings */}
            <div className="mt-6">
              {!showChangePassword ? (
                <button onClick={toggleShowChangePassword} className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Change Password</button>
              ) : (
                <div className="mt-4 p-4 border rounded bg-gray-50 space-y-3">
                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">Old Password</span>
                    <input className="input w-full" type="password" value={passwordForm.oldPassword} onChange={(e) => handlePasswordInputChange('oldPassword', e.target.value)} />
                    {passwordErrors.oldPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.oldPassword}</p>}
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">New Password</span>
                    <input className="input w-full" type="password" value={passwordForm.newPassword} onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)} />
                    {passwordErrors.newPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>}
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm text-slate-600">Confirm Password</span>
                    <input className="input w-full" type="password" value={passwordForm.confirmPassword} onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)} />
                    {passwordErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmPassword}</p>}
                  </label>

                  <div className="flex gap-3">
                    <button onClick={handleCancelChangePassword} className="border px-4 py-2 rounded">Cancel</button>
                    <button onClick={handleSubmitPassword} disabled={pwdLoading} className="bg-blue-600 text-white px-4 py-2 rounded">{pwdLoading ? 'Saving...' : 'Save Password'}</button>
                  </div>
                </div>
              )}
            </div>          </div>
        </div>
      </div>
    </div>
  )
}
