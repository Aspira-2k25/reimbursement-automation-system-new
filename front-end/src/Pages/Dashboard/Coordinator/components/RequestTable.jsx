import MobileTableSort from '../../../../components/MobileTableSort'
"use client"

import { useState } from "react"
import { Eye, Edit, User, CheckCircle, Clock, XCircle, Check, X } from "lucide-react"

export default function RequestTable({
  requests,
  showActions = false,
  showStudentInfo = true,
  actionType = "default",
  onView,
  onApprove,
  onReject,
}) {
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "under principal":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "under hod":
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"

    switch (status.toLowerCase()) {
      case "approved":
        return `${baseClasses} bg-green-100 text-green-800`
      case "pending":
        return `${baseClasses} bg-orange-100 text-orange-800`
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800`
      case "under principal":
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case "under hod":
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  return (
    <><MobileTableSort fields={[{"key":"id","label":"Application ID"},{"key":"studentName","label":"Student Name"},{"key":"category","label":"Category"},{"key":"status","label":"Status"},{"key":"amount","label":"Amount"},{"key":"submittedDate","label":"Submitted Date"},{"key":"lastUpdated","label":"Last Updated"}]} sort={{ key: sortField, direction: sortDirection }} onSort={handleSort} /><div className="overflow-x-auto" data-mobile-card-container="">
      <table className="min-w-full divide-y divide-gray-200" data-mobile-cards="" role="table">
        <thead className="bg-gray-50" role="rowgroup">
          <tr role="row">
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("id")}
             role="columnheader">
              Application ID
            </th>
            {showStudentInfo && (
              <th
                className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("studentName")}
               role="columnheader">
                Student Name
              </th>
            )}
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("category")}
             role="columnheader">
              Category
            </th>
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
             role="columnheader">
              Course Name
            </th>
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
             role="columnheader">
              Marks
            </th>
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("status")}
             role="columnheader">
              Status
            </th>
            {!showStudentInfo && (
              <th
                className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("amount")}
               role="columnheader">
                Amount
              </th>
            )}
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("submittedDate")}
             role="columnheader">
              Submitted Date
            </th>
            <th
              className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("lastUpdated")}
             role="columnheader">
              Last Updated
            </th>
            {showActions && (
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" role="columnheader">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50 transition-colors" role="row">
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900" data-label="Application ID" role="cell">
                {request.id}
              </td>
              {showStudentInfo && (
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap" data-label="Student Name" role="cell">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{request.studentName}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{request.studentId} • {request.department || 'N/A'}</div>
                    </div>
                  </div>
                </td>
              )}
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900" data-label="Category" role="cell">
                {request.category}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900" data-label="Course Name" role="cell">
                {request.courseName || 'N/A'}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900" data-label="Marks" role="cell">
                {request.marks !== undefined && request.marks !== null ? `${request.marks}%` : 'N/A'}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap" data-label="Status" role="cell">
                <span className={getStatusBadge(request.status)}>
                  {getStatusIcon(request.status)}
                  <span className="hidden sm:inline">{request.status}</span>
                  <span className="sm:hidden">{request.status.split(' ')[0]}</span>
                </span>
              </td>
              {!showStudentInfo && (
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900" data-label="Amount" role="cell">
                  {request.amount}
                </td>
              )}
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-label="Submitted Date" role="cell">
                {request.submittedDate}
              </td>
              <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-label="Last Updated" role="cell">
                {request.lastUpdated}
              </td>
              {showActions && (
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium" data-label="Actions" role="cell">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {actionType === "coordinator" ? (
                      <>
                        <button
                          onClick={() => onView && onView(request)}
                          className="text-blue-600 hover:text-blue-900 active:text-blue-800 p-1 rounded hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          title="View"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        {request.status.toLowerCase() === "pending" && (
                          <>
                            <button
                              onClick={() => onApprove && onApprove(request)}
                              className="text-green-600 hover:text-green-900 active:text-green-800 p-1 rounded hover:bg-green-50 active:bg-green-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                              title="Approve"
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => onReject && onReject(request)}
                              className="text-red-600 hover:text-red-900 active:text-red-800 p-1 rounded hover:bg-red-50 active:bg-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                              title="Reject"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button aria-label="View details" className="text-blue-600 hover:text-blue-900 active:text-blue-800 p-1 rounded hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 active:text-gray-800 p-1 rounded hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div></>
  )
}
