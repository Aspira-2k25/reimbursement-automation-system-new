import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAdminContext } from './AdminLayout'
import { Users, UserPlus, TrendingUp, Award } from 'lucide-react'
import FacultyManagement from './FacultyManagement'

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50'
  }
  const iconColors = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  }

  return (
    <motion.div
      className={`${bgColors[color]} rounded-lg p-6 border border-gray-200`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`${iconColors[color]} rounded-lg p-3`}>
          <Icon className="w-6 h-6" />
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
