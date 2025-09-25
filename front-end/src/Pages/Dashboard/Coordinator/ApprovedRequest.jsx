import RequestTable from "./components/RequestTable"
import { CheckCircle } from "lucide-react"

export default function ApprovedRequest({ approvedRequests = [] }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section - Responsive */}
      <div className="text-center px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Approved Applications
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
          View all approved student reimbursement requests
        </p>
      </div>

      {/* Approved Applications Table - Responsive */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Approved Applications
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 self-start sm:self-center">
            {approvedRequests.length} Approved
          </span>
        </div>
        <RequestTable requests={approvedRequests} showActions={false} />
      </div>
    </div>
  )
}
