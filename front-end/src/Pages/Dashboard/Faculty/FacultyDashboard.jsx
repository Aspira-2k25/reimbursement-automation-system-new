import React from "react"
import { toast } from "react-hot-toast"
import { ShieldAlert } from "lucide-react"
import "../Dashboard.css"
import ReminderBanner from "./components/ReminderBanner"
import StatCard from "./components/StatCard"
import InfoTipBox from "./components/InfoTipBox"
import { useProfile } from "./ProfileContext"
import { useNavigate } from "react-router-dom"
import { usePortalStatus } from "../../../hooks/usePortalStatus"

// Available reimbursement options for faculty
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
  const { portal, isNptelOpen } = usePortalStatus('nptel')

  // Available reimbursement options for faculty
  const [reimbursementOptions] = React.useState(facultyReimbursementOptions)

  /**
   * Handle applying for a reimbursement option
   * @param {Object} option - The selected reimbursement option
   */
  const handleApply = (option) => {
    if (option.id === "nptel") {
      if (!isNptelOpen) {
        toast.error(portal?.closedMessage || "NPTEL Reimbursement Portal is currently closed by the Principal.");
        return;
      }
      navigate("/faculty-nptel-form");

    } else {
      toast('This reimbursement type is not available yet.')
      // TODO: Implement actual application logic
    }
  }




  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 page-content">
      {/* Reminder banner for important notifications */}
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* NPTEL Portal Closed Notice Banner */}
        {!isNptelOpen && (
          <div className="mb-6 p-4 sm:p-4.5 rounded-2xl flex items-start sm:items-center gap-3.5 bg-rose-50/90 border border-rose-200 text-rose-950 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 border border-rose-200 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-rose-900">NPTEL Portal Currently Closed</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800">
                  Administration Notice
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                {portal?.closedMessage || 'The NPTEL Reimbursement Portal is currently paused for new submissions by the Administration.'}
              </p>
            </div>
          </div>
        )}

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
                disabled={opt.id !== 'nptel' || (opt.id === 'nptel' && !isNptelOpen)}
                customLabel={opt.id === 'nptel' && !isNptelOpen ? 'Portal Closed' : undefined}
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