import React from "react"
import { useNavigate } from "react-router-dom"
import { useProfile } from "../ProfileContext"

// ============================================
// CONFIGURABLE REMINDER SETTINGS
// Update these values to change the reminder dynamically
// ============================================
const REMINDER_CONFIG = {
  title: "Research Grant",
  deadline: "31st March 2026", // Update this date as needed
  description: "reimbursement window closes on"
}
// ============================================

export default function ReminderBanner() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [deadlineDismissed, setDeadlineDismissed] = React.useState(false)

  // Check if department needs to be set
  const needsDepartment = !profile.departmentSet || !profile.department

  // Build the dynamic reminder message
  const reminderMessage = `${REMINDER_CONFIG.title} ${REMINDER_CONFIG.description} ${REMINDER_CONFIG.deadline}`

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 space-y-3">
      {/* Department Alert Banner - Non-dismissable, shows when department not set */}
      {needsDepartment && (
        <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{ backgroundColor: 'color-mix(in oklab, #f59e0b 20%, white)', border: '1px solid color-mix(in oklab, #f59e0b 50%, white)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklab, #f59e0b 10%, white))' }}></div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in oklab, #f59e0b 30%, white)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: '#92400e' }}>Action Required</span>
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: '#d97706' }}></div>
                  <span className="text-sm" style={{ color: '#b45309' }}>Profile Setup</span>
                </div>
                <p className="mt-1 font-medium" style={{ color: '#b45309' }}>Please select your department to complete your profile setup</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/profile")}
              className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-md"
              style={{ backgroundColor: '#d97706' }}
            >
              Update Department
            </button>
          </div>
        </div>
      )}

      {/* Deadline Reminder Banner - Dismissable */}
      {!deadlineDismissed && (
        <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{ backgroundColor: 'color-mix(in oklab, #65CCB8 30%, white)', border: '1px solid color-mix(in oklab, #57BA98 40%, white)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklab, #65CCB8 15%, white))' }}></div>
          <div className="relative flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in oklab, #57BA98 35%, white)', color: '#3B945E' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: '#182628' }}>Important Reminder</span>
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: '#3B945E' }}></div>
                  <span className="text-sm" style={{ color: '#3B945E' }}>Deadline Alert</span>
                </div>
                <p className="mt-1 font-medium" style={{ color: '#3B945E' }}>{reminderMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setDeadlineDismissed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ color: '#3B945E' }}
              aria-label="Dismiss reminder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
