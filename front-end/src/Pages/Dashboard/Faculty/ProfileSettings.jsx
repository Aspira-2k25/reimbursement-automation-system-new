import ChangeUsername from '../../../components/ChangeUsername'
import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import { useProfile } from "./ProfileContext"
import { authAPI } from "../../../services/api"
import { useAuth } from "../../../context/AuthContext"

/**
 * Faculty ProfileSettings Component
 * Allows faculty to update their profile information
 */
export default function ProfileSettings() {
  const { profile, updateProfile } = useProfile()
  const { user } = useAuth()

  // State for form inputs
  const [name, setName] = React.useState(profile.name)
  const [isLoading, setIsLoading] = React.useState(false)

  // Sync form state with profile context when profile changes
  React.useEffect(() => {
    setName(profile.name)
  }, [profile])

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error("Full name is required.")
      const result = await authAPI.updateProfile({ name: trimmedName })
      if (!result?.user) throw new Error("Server did not return the saved profile.")
      updateProfile({ name: result.user.name })
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { ...user, ...result.user } }))
      toast.success("Faculty profile saved.")
    } catch (error) {
      toast.error(error.message || "Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Discard unsaved changes
   */
  const handleReset = () => {
    setName(profile.name)
  }

  return (
    <><div><main className="mx-auto max-w-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 page-content">
      <div className="section">
        {/* Header section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Faculty Profile Settings</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Update your name. Department, designation and role are managed by an administrator.
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
              maxLength={100}
              disabled={isLoading}
            />
          </label>

          {/* Department input */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Department</span>
            <input
              className="input w-full"
              value={profile.department || 'Not assigned'}
              readOnly
            />
          </label>

          {/* Designation input */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Designation</span>
            <input
              className="input w-full"
              value={profile.designation || "Not assigned"}
              readOnly
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
              Discard Changes
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

      </div>
    </main></div><div className="mx-auto max-w-5xl p-4 sm:p-6"><ChangeUsername /></div></>
  )
}