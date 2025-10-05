import { Lightbulb } from "lucide-react"

export default function InfoTipBox() {
  return (
    <div className="rounded-lg p-4 sm:p-6" style={{backgroundColor: 'var(--color-light-teal)', border: '1px solid var(--color-medium-teal)'}}>
      <div className="flex items-start gap-2 sm:gap-3">
        <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" style={{color: 'var(--color-dark-gray)'}} />
        <div>
          <h4 className="text-xs sm:text-sm font-medium mb-1 sm:mb-2" style={{color: 'var(--color-dark-gray)'}}>
            💡 Professional Tip
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed" style={{color: 'var(--color-dark-gray)'}}>
            Submit your reimbursement requests within 30 days of the expense. Ensure all receipts and certificates are
            clear and legible for faster approval processing.
          </p>
        </div>
      </div>
    </div>
  )
}
