"use client"

import { useState, useCallback, useMemo } from "react"
import ApplyCard from "./components/ApplyCard"
import ReminderBanner from "./components/ReminderBanner"
import RequestTable from "./components/RequestTable"
import StatCard from "./components/StatCard"
import { FlaskConical, GraduationCap, Users, Plane, FileText, CheckCircle, Clock, XCircle } from "lucide-react"
import { toast } from "react-hot-toast"

// Dynamic faculty stats will be calculated based on actual data

const facultyRequests = [
  {
    id: "FAC001",
    category: "Research Grant",
    status: "Under Principal",
    submittedDate: "8/10/2025",
    lastUpdated: "8/15/2025",
    amount: "₹50,000",
  },
  {
    id: "FAC002",
    category: "FDP Program",
    status: "Approved",
    submittedDate: "8/5/2025",
    lastUpdated: "8/20/2025",
    amount: "₹15,000",
  },
  {
    id: "FAC003",
    category: "Conference",
    status: "Under HOD",
    submittedDate: "8/12/2025",
    lastUpdated: "8/18/2025",
    amount: "₹25,000",
  },
  {
    id: "FAC004",
    category: "Workshop",
    status: "Rejected",
    submittedDate: "8/8/2025",
    lastUpdated: "8/14/2025",
    amount: "₹8,000",
  },
]

const reimbursementCategories = [
  {
    title: "Research Grants",
    description: "Funding for research projects and academic publications",
    icon: FlaskConical,
    avgAmount: "₹15,000",
    color: "blue",
  },
  {
    title: "Faculty Development Programs (FDPs)",
    description: "Professional development and training programs",
    icon: GraduationCap,
    avgAmount: "₹8,000",
    color: "blue",
  },
  {
    title: "Workshops & Conference",
    description: "Academic conferences and workshop participation",
    icon: Users,
    avgAmount: "₹5,000",
    color: "blue",
  },
  {
    title: "Travel Alliance",
    description: "Travel expenses for academic purposes",
    icon: Plane,
    avgAmount: "₹12,000",
    color: "blue",
  },
]

export default function ApplyReimbursement() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")

  const handleApplyClick = useCallback((category) => {
    setSelectedCategory(category)
    const categoryMessages = {
      "Research Grants": "Applied for Research Grants successfully!",
      "Faculty Development Programs (FDPs)": "Applied for Faculty Development Program successfully!",
      "Workshops & Conference": "Applied for Workshop & Conference successfully!",
      "Travel Alliance": "Applied for Travel Alliance successfully!",
    }
    toast.success(categoryMessages[category] || `Applied for ${category} successfully!`)
  }, [])

  // Memoize filtered requests to prevent unnecessary recalculations
  const filteredRequests = useMemo(() => {
    if (searchTerm.trim() === "") {
      return facultyRequests
    }
    return facultyRequests.filter((request) =>
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.amount.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  // Dynamic faculty stats calculation
  const facultyStats = useMemo(() => {
    // Calculate pending requests including all pending statuses
    const pendingRequests = facultyRequests.filter((req) =>
      req.status === "Pending" ||
      req.status === "Under Principal" ||
      req.status === "Under HOD"
    )

    // Calculate total disbursed amount for approved requests
    const approvedRequests = facultyRequests.filter((req) => req.status === "Approved")
    const totalDisbursed = approvedRequests.reduce((sum, req) => {
      const amount = parseFloat(req.amount.replace(/[₹,]/g, ''))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)

    return [
      {
        title: "Total Applications",
        value: facultyRequests.length.toString(),
        icon: FileText,
        color: "blue",
        subtitle: "This month and earlier"
      },
      {
        title: "Total Approved",
        value: approvedRequests.length.toString(),
        icon: CheckCircle,
        color: "green",
        subtitle: `₹${totalDisbursed.toLocaleString()} disbursed`
      },
      {
        title: "Pending Review",
        value: pendingRequests.length.toString(),
        icon: Clock,
        color: "orange",
        subtitle: "Awaiting approval"
      },
      {
        title: "Rejected",
        value: facultyRequests.filter((req) => req.status === "Rejected").length.toString(),
        icon: XCircle,
        color: "red",
        subtitle: "Need revision"
      },
    ]
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      <ReminderBanner />

      {/* Welcome Banner - Responsive */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg w-full max-w-2xl" style={{backgroundColor: 'color-mix(in oklab, var(--color-moss-lime) 30%, white)', border: '1px solid color-mix(in oklab, var(--color-moss-sage) 40%, white)'}}>
        </div>
      </div>

      {/* Main Title Section - Responsive */}
      <div className="text-center px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{color: 'var(--color-moss-deep)'}}>
          Faculty Reimbursement Portal
        </h1>
        <p className="text-base sm:text-lg mb-6 sm:mb-8 max-w-3xl mx-auto" style={{color: 'color-mix(in oklab, var(--color-moss-deep) 65%, white)'}}>
          Submit and track your academic reimbursement requests
        </p>
      </div>

      {/* Section Header - Responsive */}
      <div className="text-center mb-6 sm:mb-8 px-4">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2" style={{color: 'var(--color-moss-deep)'}}>
          Available Reimbursement Options
        </h2>
        <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{color: 'color-mix(in oklab, var(--color-moss-deep) 65%, white)'}}>
          Choose from the faculty-specific reimbursement categories below
        </p>
      </div>

      {/* Reimbursement Categories Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {reimbursementCategories.map((category, index) => (
          <ApplyCard key={index} {...category} onApplyClick={() => handleApplyClick(category.title)} />
        ))}
      </div>

      {/* Faculty Tip Box - Responsive */}
      <div className="rounded-lg p-3 sm:p-4 mb-6 sm:mb-8" style={{backgroundColor: 'color-mix(in oklab, var(--color-moss-lime) 25%, white)', border: '1px solid color-mix(in oklab, var(--color-moss-sage) 35%, white)'}}>
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{backgroundColor: 'color-mix(in oklab, var(--color-moss-sage) 35%, white)'}}>
            <span className="text-xs sm:text-sm" style={{color: 'var(--color-moss-olive)'}}>💡</span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-medium mb-1" style={{color: 'var(--color-moss-deep)'}}>
              Faculty Tip • Faculty Pro Tip
            </h4>
            <p className="text-xs sm:text-sm" style={{color: 'var(--color-moss-olive)'}}>
              Submit FDP certificates and research documentation within 7 days of submission to ensure faster processing
              of your reimbursement request.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Request Status Section - Responsive */}
        <div className="px-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            Request Status
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Track and manage your reimbursement applications
          </p>
        </div>

        {/* Statistics Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {facultyStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Search Bar - Responsive */}
        <div className="rounded-lg shadow-sm p-4 sm:p-6" style={{backgroundColor: 'white', border: '1px solid color-mix(in oklab, var(--color-moss-sage) 35%, white)'}}>
          <div className="mb-4 sm:mb-6">
            <input
              type="text"
              placeholder="Search by category, ID, status, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
            />
            {searchTerm && (
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                Showing {filteredRequests.length} of {facultyRequests.length} requests
              </p>
            )}
          </div>
        </div>

        {/* Faculty Requests Table - Responsive */}
        <div className="rounded-lg shadow-sm p-4 sm:p-6" style={{backgroundColor: 'white', border: '1px solid color-mix(in oklab, var(--color-moss-sage) 35%, white)'}}>
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              Your Faculty Requests
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Complete list of your reimbursement applications
            </p>
          </div>
          <RequestTable requests={filteredRequests} showActions={true} showStudentInfo={false} />
        </div>
      </div>
    </div>
  )
}
