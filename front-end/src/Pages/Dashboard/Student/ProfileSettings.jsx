
import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import { useProfile } from "./ProfileContext"

/**
 * Student ProfileSettings Component
 * Allows students to update their profile information
 */
export default function ProfileSettings() {
  const { profile, updateProfile, resetProfile } = useProfile()
  
  // State for form inputs
  const [name, setName] = React.useState(profile.name)
  const [dept, setDept] = React.useState(profile.department)
  const [isLoading, setIsLoading] = React.useState(false)

  // Sync form state with profile context when profile changes
  React.useEffect(() => {
    setName(profile.name)
    setDept(profile.department)
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
        department: dept
      })
      
      // Show success message
      toast.success("Profile updated successfully!")
      
      console.log("Profile updated:", { name, department: dept })
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
    toast.success("Form reset to default values")
  }

  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 page-content">
      <div className="section">
        {/* Header section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Profile Settings</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Update your name and department. Changes reflect across the portal instantly.
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
              placeholder="Enter your full name"
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
              placeholder="Enter your department"
              required
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
              type="submit" 
              className="btn btn-primary w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
