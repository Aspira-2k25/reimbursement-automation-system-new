import React from "react"

// ============================================
// CONFIGURABLE REMINDER SETTINGS
// Update these values to change the reminder dynamically
// ============================================
const REMINDER_CONFIG = {
  title: "FDP Program",
  deadline: "15th April 2026", // Update this date as needed
  description: "reimbursement window closes on"
}
// ============================================

export default function ReminderBanner() {
  const [dismissed, setDismissed] = React.useState(false)
  if (dismissed) return null

  // Build the dynamic reminder message
  const reminderMessage = `${REMINDER_CONFIG.title} ${REMINDER_CONFIG.description} ${REMINDER_CONFIG.deadline}`

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
      <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{ backgroundColor: 'var(--color-light-teal)', border: '1px solid var(--color-medium-teal)' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, var(--color-light-teal)/20)' }}></div>
        <div className="relative flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-medium-teal)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: 'var(--color-dark-gray)' }}>Important Reminder</span>
                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--color-dark-gray)' }}></div>
                <span className="text-sm" style={{ color: 'var(--color-dark-gray)' }}>Faculty Alert</span>
              </div>
              <p className="mt-1 font-medium" style={{ color: 'var(--color-dark-gray)' }}>{reminderMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--color-dark-gray)' }}
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
