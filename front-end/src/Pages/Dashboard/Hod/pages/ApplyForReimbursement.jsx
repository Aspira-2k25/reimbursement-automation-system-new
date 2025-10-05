import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import ReminderBanner from '../components/ReminderBanner'
import InfoTipBox from '../components/InfoTipBox'
import { useHODContext } from './HODLayout'
import { Atom, GraduationCap, Users, PlaneTakeoff } from 'lucide-react'

// Faculty reimbursement options for HOD (same structure as Faculty)
const hodReimbursementOptions = [
  {
    id: "research-grant",
    title: "Research Grants",
    description: "Funding for research projects and academic publications",
    icon: "ScienceOutlined"
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

// Icon mapping (same as Faculty)
const iconMap = {
  ScienceOutlined: (props) => <Atom {...props} className="text-blue-600" />,
  SchoolOutlined: (props) => <GraduationCap {...props} className="text-blue-600" />,
  Groups2Outlined: (props) => <Users {...props} className="text-blue-600" />,
  FlightTakeoffOutlined: (props) => <PlaneTakeoff {...props} className="text-blue-600" />,
}

const ApplyForReimbursement = () => {
  const { userProfile } = useHODContext()

  /**
   * Handle applying for a reimbursement option
   * @param {Object} option - The selected reimbursement option
   */
  const handleApply = (option) => {
    toast.success(`Application started for ${option.title}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 page-content">  
      {/* Reminder banner for important notifications */}
      <ReminderBanner />

      <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Welcome section with greeting and main title */}
        <motion.div 
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium mb-3 sm:mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-pulse"></div>
            WELCOME, {userProfile?.fullName || 'Dr. Jagan Kumar'}
          </motion.div>
          
          <motion.h1 
            className="text-slate-900 font-bold text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            HOD Reimbursement Portal
          </motion.h1>
          
          <motion.p 
            className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Submit and track your academic reimbursement requests
          </motion.p>
        </motion.div>

        {/* Section header for available options */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-slate-900 font-semibold text-lg sm:text-xl lg:text-2xl mb-2">Available Reimbursement Options</h2>
          <p className="text-slate-600 text-sm sm:text-base">Choose from the faculty-specific reimbursement categories below</p>
        </div>

        {/* Grid of reimbursement option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <AnimatePresence>
            {hodReimbursementOptions.length > 0 ? (
              hodReimbursementOptions.map((opt, index) => {
                const Icon = iconMap[opt.icon] || Atom
                return (
                  <motion.div 
                    key={opt.id}
                    className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative p-4 sm:p-5 lg:p-6 h-full flex flex-col">
                      <motion.div 
                        className="flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300"
                        whileHover={{ rotate: 5 }}
                      >
                        <Icon size={20} className="sm:hidden" />
                        <Icon size={24} className="hidden sm:block lg:hidden" />
                        <Icon size={28} className="hidden lg:block" />
                      </motion.div>
                      <h3 className="text-slate-900 font-semibold text-base sm:text-lg lg:text-xl mb-2">{opt.title}</h3>
                      <p className="text-slate-600 text-xs sm:text-sm lg:text-base flex-1 leading-relaxed">{opt.description}</p>
                      <motion.button
                        onClick={() => handleApply(opt)}
                        className="mt-4 sm:mt-6 w-full rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-4 py-2.5 sm:py-3 text-white font-medium text-sm sm:text-base shadow-sm transition-all duration-200 hover:shadow-md hover:from-blue-700 hover:to-indigo-700"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Apply Now
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <motion.div 
                className="col-span-full text-center py-8 sm:py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-slate-500 text-base sm:text-lg">No reimbursement options available</div>
                <div className="text-slate-400 text-sm mt-2">Please check back later</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Information tip box for user guidance */}
        <InfoTipBox />
      </section>
    </main>
  )
}

export default ApplyForReimbursement
