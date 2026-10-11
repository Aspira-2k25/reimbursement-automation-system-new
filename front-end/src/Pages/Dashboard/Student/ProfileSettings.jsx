
import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import { useProfile } from "./ProfileContext"

const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "CSE AI and ML",
  "CSE Data Science",
  "Civil Engineering",
  "Mechanical Engineering"
]

const ACADEMIC_YEARS = [
  { id: 'SE', label: 'Second Year (SE)' },
  { id: 'TE', label: 'Third Year (TE)' },
  { id: 'BE', label: 'Final Year (BE)' }
]

/**
 * Student ProfileSettings Component
 * Allows students to update their profile information
 */
export default function ProfileSettings() {
  const { profile, updateProfile } = useProfile()

  // State for form inputs
  const [name, setName] = React.useState(profile.name)
  const [dept, setDept] = React.useState(profile.department)
  const [year, setYear] = React.useState(profile.year || '')
  const [isLoading, setIsLoading] = React.useState(false)

  // Sync form state with profile context when profile changes
  React.useEffect(() => {
    setName(profile.name)
    setDept(profile.department)
    setYear(profile.year || '')
  }, [profile])

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!dept) {
      toast.error("Please select your department")
      return
    }

    if (!year) {
      toast.error("Please select your academic year")
      return
    }

    setIsLoading(true)

    try {
      // Update profile in context (persists to localStorage)
      updateProfile({
        name: name,
        department: dept,
        year: year,
        nameCustomized: true // Flag to preserve custom name across re-logins
      })

      // Show success message
      toast.success("Academic display preferences saved on this device")
    } catch {
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reset form to default values
   */
  const handleReset = () => {
    setName(profile.name)
    setDept(profile.department)
    setYear(profile.year || '')
    toast.success("Unsaved changes discarded")
  }

  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 page-content">
      <div className="section">
        {/* Header section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold" style={{ color: '#182628' }}>Profile Settings</h1>
          <p className="mt-1 text-sm sm:text-base" style={{ color: '#3B945E' }}>
            Department and Year of study are saved on this device for hassle-free reimbursement applications.
          </p>
        </div>

        {(!profile.departmentSet || !profile.yearSet) && (
          <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'color-mix(in oklab, #f59e0b 15%, white)', borderColor: 'color-mix(in oklab, #f59e0b 40%, white)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in oklab, #f59e0b 25%, white)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#92400e' }}>
                Please select both your department and academic year below to complete your profile setup.
              </p>
            </div>
          </div>
        )}

        {/* Profile form */}
        <form
          className="mt-4 sm:mt-6 grid grid-cols-1 gap-4"
          onSubmit={handleSubmit}
        >
          {/* Full Name input */}
          <label className="grid gap-1">
            <span className="text-sm font-medium" style={{ color: '#3B945E' }}>Full Name</span>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </label>

          {/* Department dropdown */}
          <label className="grid gap-1">
            <span className="text-sm font-medium" style={{ color: '#3B945E' }}>Department</span>
            <select
              className="input w-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              required
              style={{
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233B945E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '40px',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>Select your department</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          {/* Academic Year dropdown */}
          <label className="grid gap-1">
            <span className="text-sm font-medium" style={{ color: '#3B945E' }}>Academic Year / Current Year of Study</span>
            <select
              className="input w-full"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              style={{
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233B945E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '40px',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>Select your year of study</option>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>

          {/* Friendly Tip Box requested by user */}
          <div className="rounded-xl border border-teal-200/90 bg-teal-50/70 p-3.5 text-xs text-teal-950 mt-1 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-base select-none mt-0.5">💡</span>
              <div className="leading-relaxed">
                <span className="font-semibold block text-teal-900">Next Year Promotion Tip:</span>
                <p className="text-teal-800 mt-0.5">
                  When you advance to the next academic year (e.g., SE to TE, or TE to BE), you can return here anytime to update your Academic Year.
                </p>
              </div>
            </div>
          </div>

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

