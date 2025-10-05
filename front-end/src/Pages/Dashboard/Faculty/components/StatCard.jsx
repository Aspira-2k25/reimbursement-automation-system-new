import React from "react"
import { Atom, GraduationCap, Users, PlaneTakeoff } from "lucide-react"

// Icon mapping for consistent icon usage across the application
const iconMap = {
  ScienceOutlined: (props) => <Atom {...props} className="text-blue-600" />,
  SchoolOutlined: (props) => <GraduationCap {...props} className="text-blue-600" />,
  Groups2Outlined: (props) => <Users {...props} className="text-blue-600" />,
  FlightTakeoffOutlined: (props) => <PlaneTakeoff {...props} className="text-blue-600" />,
}

/**
 * StatCard Component
 * Displays a reimbursement option card with icon, title, description and apply button
 * @param {Object} option - The reimbursement option data
 * @param {Function} onApply - Callback function when apply button is clicked
 */
export default function StatCard({ option, onApply }) {
  // Loading skeleton when no option is provided
  if (!option) {
    return (
      <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="relative p-6 h-full flex flex-col">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 mb-4">
            <div className="h-6 w-6 rounded bg-slate-300"></div>
          </div>
          <div className="h-6 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 bg-slate-200 rounded mb-4 flex-1"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Get the appropriate icon component
  const Icon = iconMap[option?.icon] || ((props) => <Atom {...props} className="text-blue-600" />)
  const title = option?.title || "Reimbursement Option"
  const description = option?.description || "Apply for this reimbursement option"

  /**
   * Handle apply button click
   */
  const handleApply = () => {
    if (onApply) {
      onApply(option)
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1" style={{border: '1px solid var(--color-light-teal)'}}>
      {/* Hover background effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background: 'linear-gradient(135deg, var(--color-light-teal)/20, var(--color-medium-teal)/20)'}}></div>
      
      <div className="relative p-4 sm:p-5 lg:p-6 h-full flex flex-col">
        {/* Icon container with hover animation */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-lg sm:rounded-xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" style={{background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal))'}}>
          <Icon size={20} className="sm:hidden text-white" />
          <Icon size={24} className="hidden sm:block lg:hidden text-white" />
          <Icon size={28} className="hidden lg:block text-white" />
        </div>
        
        {/* Card title */}
        <h3 className="font-semibold text-base sm:text-lg lg:text-xl mb-2" style={{color: 'var(--color-dark-gray)'}}>{title}</h3>
        
        {/* Card description */}
        <p className="text-xs sm:text-sm lg:text-base flex-1 leading-relaxed" style={{color: 'var(--color-dark-gray)'}}>{description}</p>
        
        {/* Apply button */}
        <button
          onClick={handleApply}
          className="mt-4 sm:mt-6 w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white font-medium text-sm sm:text-base shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          style={{background: 'linear-gradient(135deg, var(--color-medium-teal), var(--color-light-teal), var(--color-dark-green))'}}
        >
          Apply Now
        </button>
      </div>
    </div>
  )
}