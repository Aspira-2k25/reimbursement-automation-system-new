import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Building2,
  Save,
  Loader2,
  AlertCircle,
  Shield,
  Lock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAccountsContext } from './AccountsLayout'
import { authAPI } from '../../../../services/api'

const ProfileSettings = () => {
  const { userProfile, setUserProfile } = useAccountsContext()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    email: userProfile?.email || '',
    designation: userProfile?.designation || '',
    department: userProfile?.department || 'Accounts'
  })

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Update profile via API - backend expects 'name' not 'fullName'
      await authAPI.updateProfile({
        name: formData.fullName
      })

      // Update local context
      setUserProfile(prev => ({
        ...prev,
        ...formData
      }))

      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error?.error || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }, [formData, setUserProfile])

  const handleChangePassword = useCallback(() => {
    toast('Password change functionality would be implemented here')
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-[#57BA98] to-[#3B945E] rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {formData.fullName ? formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AC'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{formData.fullName || 'Accounts User'}</h3>
              <p className="text-sm text-gray-500">{formData.designation || 'Accounts Officer'}</p>
              <p className="text-xs text-[#3B945E] mt-1">{formData.department}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57BA98] focus:border-[#57BA98]"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Email address"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Designation"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Department"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-[#65CCB8]/20 rounded-lg border border-[#65CCB8]/40">
            <AlertCircle className="w-5 h-5 text-[#3B945E] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-[#3B945E]">Note</h4>
              <p className="text-sm text-slate-700 mt-1">
                Some fields cannot be edited. Please contact the administrator if you need to update your email, designation, or department.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#57BA98] text-white rounded-lg hover:bg-[#3B945E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Security Settings - Change Password */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#3B945E]" />
          <h3 className="text-lg font-semibold text-gray-900">Security</h3>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleChangePassword}
            className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">Change Password</div>
              <div className="text-xs text-gray-500">Update your account password</div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default ProfileSettings
