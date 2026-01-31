import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import ReminderBanner from "./components/ReminderBanner"
import StatCard from "./components/StatCard"
import InfoTipBox from "./components/InfoTipBox"
import { useProfile } from "./ProfileContext"
import { useNavigate } from "react-router-dom"

// Dummy data for faculty reimbursement options
const facultyReimbursementOptions = [
  {
    id: "nptel",
    title: "NPTEL Certification",
    description: "Reimbursement for NPTEL course completion certificates",
    icon: "SchoolOutlined"
  },
  {
    id: "fdp-program",
    title: "Faculty Development Programs",
    description: "Professional development and training programs",
    icon: "SchoolOutlined"
  },
  {
    id: "conference-workshop",
    title: "Conferences & Workshops",
    description: "Academic conferences and workshop participation",
    icon: "Groups2Outlined"
  },
  {
    id: "travel-alliance",
    title: "Travel Alliance",
    description: "Travel expenses for academic purposes",
    icon: "FlightTakeoffOutlined"
  }
]

/**
 * Faculty Dashboard Component
 * Main dashboard for faculty to view and manage reimbursement requests
 */
export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile()

  // State for reimbursement options - using dummy data for demonstration
  const [reimbursementOptions] = React.useState(facultyReimbursementOptions)

  /**
   * Handle applying for a reimbursement option
   * @param {Object} option - The selected reimbursement option
   */
  const handleApply = (option) => {
    if (option.id === "nptel") {
      navigate("/faculty-nptel-form");

    } else {
      toast.success(`Application started for ${option.title}`)
      // TODO: Implement actual application logic
    }
  }




  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 page-content">
      {/* Reminder banner for important notifications */}
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Welcome section with greeting and main title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#65CCB8]/20 text-[#3B945E] text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3B945E] animate-pulse"></div>
            WELCOME, {profile.name}
          </div>

          <h1 className="text-slate-900 font-bold text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">Faculty Reimbursement Portal</h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0">Submit and track your academic reimbursement requests</p>
        </div>

        {/* Section header for available options */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-slate-900 font-semibold text-lg sm:text-xl lg:text-2xl mb-2">Available Reimbursement Options</h2>
          <p className="text-slate-600 text-sm sm:text-base">Choose from the faculty-specific reimbursement categories below</p>
        </div>

        {/* Grid of reimbursement option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {reimbursementOptions.length > 0 ? (
            reimbursementOptions.map((opt) => (
              <StatCard
                key={opt.id}
                option={opt}
                onApply={() => handleApply(opt)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8 sm:py-12">
              <div className="text-slate-500 text-base sm:text-lg">No reimbursement options available</div>
              <div className="text-slate-400 text-sm mt-2">Please check back later</div>
            </div>
          )}
        </div>

        {/* Information tip box for user guidance */}
        <InfoTipBox />
      </section>
    </main>
  )
}