import React from "react"
import { toast } from "react-hot-toast"
import { GraduationCap, ArrowRight, ShieldAlert } from "lucide-react"
import "../Dashboard.css"
import ReminderBanner from "./components/ReminderBanner.jsx"
import StatCard from "./components/StatCard.jsx"
import InfoTipBox from "./components/InfoTipBox.jsx"
import { useProfile } from "./ProfileContext"
import { useNavigate } from "react-router-dom"
import { usePortalStatus } from "../../../hooks/usePortalStatus"

// Available reimbursement options for students
const studentReimbursementOptions = [
  {
    id: "nptel",
    title: "NPTEL Certification",
    description: "Reimbursement for NPTEL course completion certificates",
    icon: "SchoolOutlined"
  },
  {
    id: "lab-materials",
    title: "Lab Materials",
    description: "Essential laboratory equipment and materials for projects",
    icon: "BuildOutlined"
  },
  {
    id: "conference",
    title: "Conference Attendance",
    description: "Academic conference registration and travel expenses",
    icon: "Groups2Outlined"
  },
  {
    id: "workshop",
    title: "Workshop Training",
    description: "Professional development workshop participation fees",
    icon: "FlightTakeoffOutlined"
  }
]

/**
 * Student Dashboard Component
 * Main dashboard for students to view and manage reimbursement requests
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { portal, isNptelOpen } = usePortalStatus('nptel');

  // Available reimbursement options for students
  const [reimbursementOptions] = React.useState(studentReimbursementOptions)

  /**
   * Handle applying for a reimbursement option
   * If department or year is missing, redirects directly to Profile Settings page
   * @param {Object} option - The selected reimbursement option
   */
  const handleApply = (option) => {
    if (option.id === "nptel") {
      if (!isNptelOpen) {
        toast.error(portal?.closedMessage || "NPTEL Reimbursement Portal is currently closed by the Principal.");
        return;
      }
      if (!profile.department || !profile.year) {
        toast.error("Please set your Department and Academic Year in Profile Settings first");
        navigate("/dashboard/profile");
        return;
      }
      navigate("/student-nptel-form");
    } else {
      toast('This reimbursement type is not available yet.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 page-content">
      {/* Reminder banner for important notifications */}
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Academic Profile Setup Banner (Top Notice matching theme) */}
        {(!profile.department || !profile.year) ? (
          <div
            className="mb-6 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xs transition-all"
            style={{
              backgroundColor: 'color-mix(in oklab, #65CCB8 15%, white)',
              border: '1px solid color-mix(in oklab, #3B945E 35%, white)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in oklab, #3B945E 15%, white)',
                  color: '#3B945E'
                }}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold" style={{ color: '#182628' }}>
                  Please complete your Academic Profile
                </h4>
                <p className="text-xs mt-0.5" style={{ color: '#3B945E' }}>
                  Select your Department and Academic Year in Profile Settings to unlock reimbursement applications.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5 self-end sm:self-auto hover:opacity-90"
              style={{
                backgroundColor: '#3B945E'
              }}
            >
              <span>Go to Profile Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="mb-6 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs shadow-xs"
            style={{
              backgroundColor: 'color-mix(in oklab, #65CCB8 8%, white)',
              border: '1px solid color-mix(in oklab, #65CCB8 25%, white)',
              color: '#182628'
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B945E' }} />
              <span className="font-semibold">{profile.department}</span>
              <span style={{ color: '#65CCB8' }}>·</span>
              <span
                className="font-medium px-2 py-0.5 rounded-md text-[11px]"
                style={{ backgroundColor: 'color-mix(in oklab, #3B945E 15%, white)', color: '#3B945E' }}
              >
                {profile.year}
              </span>
            </div>
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="text-[11px] font-semibold underline hover:no-underline cursor-pointer ml-2"
              style={{ color: '#3B945E' }}
            >
              Change in Profile Settings
            </button>
          </div>
        )}

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
            HELLO , {profile.name}
          </div>

          <h1 className="text-slate-900 font-bold text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">
            Reimbursement Management
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0">
            Submit and track your reimbursement requests
          </p>
        </div>

        {/* Section header for available options */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-slate-900 font-semibold text-lg sm:text-xl lg:text-2xl mb-2">
            What can you claim?
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Choose from the available reimbursement options below
          </p>
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