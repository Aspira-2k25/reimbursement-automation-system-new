import { Lightbulb } from "lucide-react"

export default function InfoTipBox() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-start gap-2 sm:gap-3">
        <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
            💡 Professional Tip
          </h4>
          <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
            Submit your reimbursement requests within 30 days of the expense. Ensure all receipts and certificates are
            clear and legible for faster approval processing.
          </p>
        </div>
      </div>
    </div>
  )
}
