import React from "react"

/**
 * ReminderBanner Component
 * Displays important reminders that can be dismissed by users
 * Matches the design system used across all role dashboards
 */
export default function ReminderBanner() {
  const [dismissed, setDismissed] = React.useState(false)
  if (dismissed) return null
  const message = "Submit FDP certificates and research documentation within 7 days of submission to ensure faster processing of your reimbursement request."

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        <div className="relative flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900">Important Reminder</span>
                <div className="h-1 w-1 rounded-full bg-blue-400"></div>
                <span className="text-sm text-blue-600">HOD Alert</span>
              </div>
              <p className="text-blue-800 mt-1 font-medium">{message}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
            aria-label="Dismiss reminder"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
