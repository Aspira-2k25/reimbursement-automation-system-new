import React from "react"
import { toast } from "react-hot-toast"
import "../Dashboard.css"
import ReminderBanner from "./components/ReminderBanner.jsx"
import StatCard from "./components/StatCard.jsx"
import InfoTipBox from "./components/InfoTipBox.jsx"
import { useProfile } from "./ProfileContext"

// Dummy data for student reimbursement options
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
  const { profile } = useProfile()
  
  // State for reimbursement options - using dummy data for demonstration
  const [reimbursementOptions] = React.useState(studentReimbursementOptions)

  /**
   * Handle applying for a reimbursement option
   * @param {Object} option - The selected reimbursement option
   */
  const handleApply = (option) => {
    toast.success(`Application started for ${option.title}`)
    // TODO: Implement actual application logic
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F2F2F2] to-[#65CCB8]/10 page-content">  
      {/* Reminder banner for important notifications */}
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Welcome section with greeting and main title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4" style={{backgroundColor: 'color-mix(in oklab, #65CCB8 20%, white)', color: '#3B945E'}}>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse" style={{backgroundColor: '#3B945E'}}></div>
            HELLO , {profile.name}
          </div>
          
          <h1 className="font-bold text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3" style={{color: '#182628'}}>
            Reimbursement Management
          </h1>
          
          <p className="text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0" style={{color: '#3B945E'}}>
            Submit and track your reimbursement requests
          </p>
        </div>

        {/* Section header for available options */}
        <div className="mb-6 sm:mb-8">
          <h2 className="font-semibold text-lg sm:text-xl lg:text-2xl mb-2" style={{color: '#182628'}}>
            What can you claim?
          </h2>
          <p className="text-sm sm:text-base" style={{color: '#3B945E'}}>
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
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8 sm:py-12">
              <div className="text-base sm:text-lg" style={{color: '#3B945E'}}>No reimbursement options available</div>
              <div className="text-sm mt-2" style={{color: '#57BA98'}}>Please check back later</div>
            </div>
          )}
        </div>

        {/* Information tip box for user guidance */}
        <InfoTipBox />
      </section>
    </main>
  )
}
