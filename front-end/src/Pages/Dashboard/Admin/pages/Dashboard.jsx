import { useMemo } from "react";
import { motion } from 'framer-motion'
import { useAdminContext } from './AdminLayout'
import { Users, UserPlus, TrendingUp, Award, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react'
import FacultyManagement from './FacultyManagement'
import { usePortalStatus } from '../../../../hooks/usePortalStatus'

const StatCard = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <motion.div
      className="bg-white rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300"
      style={{ border: '1px solid var(--color-light-teal)' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium whitespace-normal" style={{ color: 'var(--color-dark-gray)' }}>{title}</p>
          <p className="text-xl sm:text-3xl font-bold mt-2" style={{ color: 'var(--color-dark-gray)' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1 whitespace-normal" style={{ color: 'var(--color-dark-gray)' }}>{subtitle}</p>}
        </div>
        <div className="rounded-full p-2 sm:p-3 flex-shrink-0 ml-2" style={{ backgroundColor: 'var(--color-medium-teal)' }}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

const Dashboard = () => {
  const { allFaculty, departments, setActiveTab } = useAdminContext()
  const { portal, isNptelOpen } = usePortalStatus('nptel')

  const stats = useMemo(() => {
    const total = allFaculty.length
    const active = allFaculty.filter(f => f.is_active).length
    const inactive = total - active
    const byDept = Math.max(0, departments.length - 1) // Exclude 'All'

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const newThisMonth = allFaculty.filter(f => {
      const dateVal = f.created_at || f.createdAt
      if (!dateVal) return false
      const created = new Date(dateVal)
      return (
        !isNaN(created.getTime()) &&
        created.getFullYear() === currentYear &&
        created.getMonth() === currentMonth
      )
    }).length

    return [
      {
        title: 'Total Staff',
        value: total.toString(),
        subtitle: `${active} active · ${inactive} inactive`,
        icon: Users,
        color: 'green'
      },
      {
        title: 'Active Staff',
        value: active.toString(),
        subtitle: total > 0 ? `${((active / total) * 100).toFixed(1)}% of total` : '0% of total',
        icon: Award,
        color: 'blue'
      },
      {
        title: 'Departments',
        value: byDept.toString(),
        subtitle: 'Staff distribution',
        icon: TrendingUp,
        color: 'purple'
      },
      {
        title: 'New This Month',
        value: newThisMonth.toString(),
        subtitle: newThisMonth === 1 ? '1 added this month' : `${newThisMonth} added this month`,
        icon: UserPlus,
        color: 'orange'
      }
    ]
  }, [allFaculty, departments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage faculty members and departments efficiently</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Quick Portal Access Summary */}
      <motion.div
        className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isNptelOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isNptelOpen ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">NPTEL Portal Status:</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isNptelOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isNptelOpen ? 'OPEN (Accepting Submissions)' : 'CLOSED / RESTRICTED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNptelOpen
                ? 'Portal is currently open for eligible applicants.'
                : portal?.closedMessage || 'Portal submissions are currently restricted.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('portals')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#3B945E] hover:bg-[#2e754a] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <span>Manage Portal Controls</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* include staff management table directly */}
      <FacultyManagement />
    </div>
  )
}

export default Dashboard
