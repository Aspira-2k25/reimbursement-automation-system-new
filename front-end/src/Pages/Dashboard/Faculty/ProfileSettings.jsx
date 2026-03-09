import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import { useProfile } from "./ProfileContext"
import { authAPI } from '../../../services/api'

/**
 * Faculty ProfileSettings Component
 * Allows faculty to update their profile information
 */
export default function ProfileSettings() {
  const { profile, updateProfile, resetProfile } = useProfile()

  // State for form inputs
  const [name, setName] = React.useState(profile.name)
  const [dept, setDept] = React.useState(profile.department)
  const [designation, setDesignation] = React.useState(profile.designation)
  const [isLoading, setIsLoading] = React.useState(false)

  // Sync form state with profile context when profile changes
  React.useEffect(() => {
    setName(profile.name)
    setDept(profile.department)
    setDesignation(profile.designation)
  }, [profile])

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update profile in context
      updateProfile({
        name: name,
        department: dept,
        designation: designation
      })

      // Show success message
      toast.success("Faculty profile updated successfully!")
    } catch (error) {
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reset form to default values
   */
  const handleReset = () => {
    resetProfile()
    setName(profile.name)
    setDept(profile.department)
    setDesignation(profile.designation)
    toast.success("Form reset to default values")
  }

  // Change password state & handlers
  const [showChangePassword, setShowChangePassword] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordErrors, setPasswordErrors] = React.useState({})
  const [pwdLoading, setPwdLoading] = React.useState(false)
  const [showPwd, setShowPwd] = React.useState({ old: false, new: false, confirm: false })

  const toggleShowChangePassword = React.useCallback(() => setShowChangePassword(s => !s), [])

  const handlePasswordInputChange = React.useCallback((field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: '' }))
  }, [passwordErrors])

  const validatePasswordForm = React.useCallback(() => {
    const errs = {}
    if (!passwordForm.oldPassword) errs.oldPassword = 'Old password is required'
    if (!passwordForm.newPassword) errs.newPassword = 'New password is required'
    else if (passwordForm.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters long'
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setPasswordErrors(errs)
    return Object.keys(errs).length === 0
  }, [passwordForm])

  const handleSubmitPassword = React.useCallback(async () => {
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

  const handleCancelChangePassword = React.useCallback(() => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordErrors({})
    setShowChangePassword(false)
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 page-content">
      <div className="section">
        {/* Header section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Faculty Profile Settings</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Update your faculty information. Changes reflect across the portal instantly.
          </p>
        </div>

        {/* Profile form */}
        <form
          className="mt-4 sm:mt-6 grid grid-cols-1 gap-3 sm:gap-4"
          onSubmit={handleSubmit}
        >
          {/* Full Name input */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Full Name</span>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          {/* Department input */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Department</span>
            <input
              className="input w-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              required
            />
          </label>

          {/* Designation input */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Designation</span>
            <input
              className="input w-full"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
              placeholder="e.g., Associate Professor"
            />
          </label>

          {/* Role input (disabled) */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Role</span>
            <input
              className="input w-full"
              value="Faculty"
              disabled
            />
          </label>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline w-full sm:w-auto"
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              className="btn btn-primary w-full sm:w-auto"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Security Settings */}
        <div className="mt-6 max-w-2xl mx-auto px-4">
          {!showChangePassword ? (
            <button onClick={toggleShowChangePassword} className="btn btn-outline w-full">Change Password</button>
          ) : (
            <div className="mt-4 p-4 border rounded bg-gray-50 space-y-3">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Old Password</span>
                <input className="input w-full" type={showPwd.old ? 'text' : 'password'} value={passwordForm.oldPassword} onChange={(e) => handlePasswordInputChange('oldPassword', e.target.value)} />
                {passwordErrors.oldPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.oldPassword}</p>}
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">New Password</span>
                <input className="input w-full" type={showPwd.new ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)} />
                {passwordErrors.newPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>}
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">Confirm Password</span>
                <input className="input w-full" type={showPwd.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)} />
                {passwordErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmPassword}</p>}
              </label>

              <div className="flex gap-3">
                <button onClick={handleCancelChangePassword} className="btn btn-outline">Cancel</button>
                <button onClick={handleSubmitPassword} disabled={pwdLoading} className="btn btn-primary">{pwdLoading ? 'Saving...' : 'Save Password'}</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}