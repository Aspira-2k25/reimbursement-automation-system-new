import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Building2,
  Badge,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
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
    phone: userProfile?.phone || '',
    designation: userProfile?.designation || '',
    department: userProfile?.department || 'Accounts',
    employeeId: userProfile?.employeeId || ''
  })

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Update profile via API
      await authAPI.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone
      })

      // Update local context
      setUserProfile(prev => ({
        ...prev,
        ...formData
      }))

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error?.error || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }, [formData, setUserProfile])

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
            <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {formData.fullName ? formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AC'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{formData.fullName || 'Accounts User'}</h3>
              <p className="text-sm text-gray-500">{formData.designation || 'Accounts Officer'}</p>
              <p className="text-xs text-amber-600 mt-1">{formData.department}</p>
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
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Badge className="w-4 h-4 inline mr-2" />
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Employee ID"
              />
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
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Note</h4>
              <p className="text-sm text-amber-700 mt-1">
                Some fields cannot be edited. Please contact the administrator if you need to update your email, employee ID, designation, or department.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}

export default ProfileSettings
