import { AlertTriangle } from "lucide-react"

export default function ReminderBanner() {
  return (
    <div className="rounded-lg p-3 sm:p-4" style={{backgroundColor: 'var(--color-light-teal)', border: '1px solid var(--color-medium-teal)'}}>
      <div className="flex items-start gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" style={{color: 'var(--color-dark-gray)'}} />
        <div>
          <h4 className="text-xs sm:text-sm font-medium" style={{color: 'var(--color-dark-gray)'}}>Reminder:</h4>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{color: 'var(--color-dark-gray)'}}>
            Review the student NPTEL result and ID document before approving a request. Each application is capped at ₹1,500.
          </p>
        </div>
      </div>
    </div>
  )
}
