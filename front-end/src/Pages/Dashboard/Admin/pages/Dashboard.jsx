import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAdminContext } from './AdminLayout'
import { Users, UserPlus, TrendingUp, Award } from 'lucide-react'
import FacultyManagement from './FacultyManagement'

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
  return (
    <motion.div
      className="bg-white rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300"
      style={{ border: '1px solid var(--color-light-teal)' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--color-dark-gray)' }}>{title}</p>
          <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-dark-gray)' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-dark-gray)' }}>{subtitle}</p>}
        </div>
        <div className="rounded-full p-2 sm:p-3 flex-shrink-0 ml-2" style={{ backgroundColor: 'var(--color-medium-teal)' }}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

const Dashboard = () => {
  const { allFaculty, departments, staffList, loading, searchQuery, setSearchQuery,
    departmentFilter, setDepartmentFilter,
    handleAddStaff, handleEditStaff, handleDeleteStaff,
    showModal, editingStaff }
    = useAdminContext()

  const stats = useMemo(() => {
    const total = allFaculty.length
    const active = allFaculty.filter(f => f.is_active).length
    const byDept = departments.length - 1 // Exclude 'All'

    return [
      {
        title: 'Total Staff',
        value: total.toString(),
        subtitle: `${active} active`,
        icon: Users,
        color: 'green'
      },
      {
        title: 'Active Staff',
        value: active.toString(),
        subtitle: `${((active / total) * 100).toFixed(1)}% of total`,
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
        value: '0',
        subtitle: 'Recently added',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* include staff management table directly */}
      <FacultyManagement />
    </div>
  )
}

export default Dashboard
