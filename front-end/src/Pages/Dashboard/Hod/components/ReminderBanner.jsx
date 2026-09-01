import React, { useMemo } from "react"
import { useHODContext } from '../pages/HODLayout'

/**
 * ReminderBanner Component
 * Displays important reminders dynamically based on pending requests
 * Uses green theme to match HOD dashboard design
 */
export default function ReminderBanner() {
  const [dismissed, setDismissed] = React.useState(false)

  // Get context data for dynamic message
  let contextData = null
  try {
    contextData = useHODContext()
  } catch (e) {
    // Context not available, use default message
  }

  const allRequests = contextData?.allRequests || []

  // Calculate dynamic message based on pending requests
  const { message, alertType, showBanner } = useMemo(() => {
    const pendingCount = allRequests.filter(r =>
      r.status === 'Pending' || r.status === 'Under HOD'
    ).length
    const underPrincipalCount = allRequests.filter(r =>
      r.status === 'Under Principal'
    ).length

    if (pendingCount > 0) {
      return {
        message: `You have ${pendingCount} pending request${pendingCount > 1 ? 's' : ''} awaiting your review. Please process them to ensure timely reimbursement.`,
        alertType: 'pending',
        showBanner: true
      }
    } else if (underPrincipalCount > 0) {
      return {
        message: `${underPrincipalCount} request${underPrincipalCount > 1 ? 's are' : ' is'} under Principal review. Track their status in the Reports section.`,
        alertType: 'info',
        showBanner: true
      }
    } else if (allRequests.length === 0) {
      return {
        message: 'No reimbursement requests yet. New requests will appear here when submitted by faculty or students.',
        alertType: 'info',
        showBanner: true
      }
    }

    return { message: '', alertType: 'info', showBanner: false }
  }, [allRequests])

  if (dismissed || !showBanner) return null

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-200/50 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-teal-500/5"></div>
        <div className="relative flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-900">
                  {alertType === 'pending' ? 'Action Required' : 'Important Reminder'}
                </span>
                <div className="h-1 w-1 rounded-full bg-green-400"></div>
                <span className="text-sm text-green-600">HOD Alert</span>
              </div>
              <p className="text-green-800 mt-1 font-medium">{message}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-green-600 hover:bg-green-100 transition-colors"
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