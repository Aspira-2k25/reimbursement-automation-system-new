import { AlertTriangle } from "lucide-react"

export default function ReminderBanner() {
  return (
    <div className="rounded-lg p-3 sm:p-4" style={{backgroundColor: 'color-mix(in oklab, var(--color-moss-lime) 30%, white)', border: '1px solid color-mix(in oklab, var(--color-moss-sage) 40%, white)'}}>
      <div className="flex items-start gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" style={{color: 'var(--color-moss-olive)'}} />
        <div>
          <h4 className="text-xs sm:text-sm font-medium" style={{color: 'var(--color-moss-deep)'}}>Reminder:</h4>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{color: 'var(--color-moss-olive)'}}>
            Faculty reimbursement window for Q4 closes on 31st March 2025. Submit your professional development claims
            before the deadline.
          </p>
        </div>
      </div>
    </div>
  )
}
