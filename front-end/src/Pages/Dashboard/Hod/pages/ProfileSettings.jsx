import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Edit3,
  Save,
  X,
  Shield,
  Eye,
  Lock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useHODContext } from './HODLayout'
import { authAPI } from '../../../../services/api'

const ProfileSettings = () => {
  const { userProfile, setUserProfile } = useHODContext()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    department: userProfile?.department || '',
    designation: userProfile?.designation || '',
    employeeId: userProfile?.employeeId || '',
    joinDate: userProfile?.joinDate || ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Load profile from backend (so the screen isn't just static mock data)
  useEffect(() => {
    const load = async () => {
      try {
        const data = await authAPI.getProfile()
        const u = data?.user
        if (!u) return

        const nextProfile = {
          ...userProfile,
          fullName: u.name || userProfile?.fullName,
          department: u.department || userProfile?.department,
          role: u.role || userProfile?.role,
          email: u.email || userProfile?.email
        }
        setUserProfile(nextProfile)

        setFormData((prev) => ({
          ...prev,
          fullName: nextProfile.fullName || '',
          email: nextProfile.email || '',
          department: nextProfile.department || '',
          designation: nextProfile.designation || prev.designation || '',
          employeeId: nextProfile.employeeId || prev.employeeId || '',
          joinDate: nextProfile.joinDate || prev.joinDate || ''
        }))
      } catch (e) {
        // Non-fatal: keep whatever is already in context
        console.error('Failed to load profile:', e)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }, [errors])

  const validateForm = useCallback(() => {
    const newErrors = {}

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.department?.trim()) {
      newErrors.department = 'Department is required'
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving')
      return
    }

    setIsLoading(true)
    try {
      // Persist supported fields to backend
      const payload = {
        name: formData.fullName,
        email: formData.email,
        department: formData.department
      }

      const res = await authAPI.updateProfile(payload)
      const updatedUser = res?.user

      // Update local state/context so header + dropdown refresh immediately
      setUserProfile((prev) => ({
        ...prev,
        fullName: updatedUser?.name ?? formData.fullName,
        email: updatedUser?.email ?? formData.email,
        department: updatedUser?.department ?? formData.department
      }))

      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error(error?.error || 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [formData, userProfile, setUserProfile, validateForm])

  const handleCancel = useCallback(() => {
    setFormData({
      fullName: userProfile?.fullName || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      department: userProfile?.department || '',
      designation: userProfile?.designation || '',
      employeeId: userProfile?.employeeId || '',
      joinDate: userProfile?.joinDate || ''
    })
    setErrors({})
    setIsEditing(false)
  }, [userProfile])

  const handleChangePassword = useCallback(() => {
    toast.info('Password change functionality would be implemented here')
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account information and security settings</p>
        </div>
        <div className="flex gap-3">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                className="flex gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: isLoading ? 1 : 1.05 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95 }}
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="edit"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.fullName
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-200'
                      } ${!isEditing ? 'bg-gray-50 text-gray-900' : ''
                      }`}
                  />
                  {errors.fullName && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.fullName && (
                  <motion.p
                    className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.fullName}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${!isEditing ? 'bg-gray-50 text-gray-900' : ''
                    }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-200'
                      } ${!isEditing ? 'bg-gray-50 text-gray-900' : ''
                      }`}
                  />
                  {errors.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <motion.p
                    className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </motion.p>
                )}
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors.department
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-200'
                      } ${!isEditing ? 'bg-gray-50 text-gray-900' : ''
                      }`}
                  />
                  {errors.department && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.department && (
                  <motion.p
                    className="mt-1 text-sm text-red-600 flex items-center gap-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.department}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${!isEditing ? 'bg-gray-50 text-gray-900' : ''
                    }`}
                />
              </div>


            </div>
          </div>

          {/* Notification Preferences removed as requested */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
            <div className="text-center">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-medium">
                  {formData.fullName
                    ? formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
                    : 'JK'
                  }
                </span>
              </div>
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                Upload New Picture
              </button>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
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
          </div>


        </div>
      </div>
    </div>
  )
}

export default ProfileSettings
