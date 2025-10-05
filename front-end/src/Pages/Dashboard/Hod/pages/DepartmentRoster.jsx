import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  GraduationCap, 
  User, 
  Plus,
  FileText,
  TrendingUp,
  Building
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import MemberTable from '../components/MemberTable'
import { useHODContext } from './HODLayout'
import { getMembersByType } from '../data/mockData'

const DepartmentRoster = () => {
  const { departmentMembers, userProfile } = useHODContext()
  const [showAddModal, setShowAddModal] = useState(false)

  // Calculate department statistics
  const departmentStats = useMemo(() => {
    const facultyMembers = getMembersByType(departmentMembers, 'Faculty')
    const studentMembers = getMembersByType(departmentMembers, 'Student')
    
    const totalReimbursements = departmentMembers.reduce((sum, member) => 
      sum + (member.totalReimbursements || 0), 0
    )

    return [
      {
        title: "Total Members",
        value: departmentMembers.length.toString(),
        subtitle: "Faculty: 5 | Students: 8",
        icon: Users,
        color: 'blue',
        trend: { direction: 'up', value: '+3.2%' }
      },
      {
        title: "Faculty Members", 
        value: facultyMembers.length.toString(),
        subtitle: "Active teaching staff",
        icon: User,
        color: 'green'
      },
      {
        title: "Students",
        value: studentMembers.length.toString(),
        subtitle: "Enrolled students",
        icon: GraduationCap,
        color: 'purple'
      },
      {
        title: "Total Reimbursements",
        value: totalReimbursements.toString(),
        subtitle: "Across all members",
        icon: FileText,
        color: 'orange',
        trend: { direction: 'up', value: '+12.5%' }
      }
    ]
  }, [departmentMembers])

  // Faculty and Student breakdown
  const facultyMembers = useMemo(() => 
    getMembersByType(departmentMembers, 'Faculty'), [departmentMembers]
  )
  
  const studentMembers = useMemo(() => 
    getMembersByType(departmentMembers, 'Student'), [departmentMembers]
  )

  const handleAddMember = () => {
    setShowAddModal(true)
    toast.info('Add member functionality would be implemented here')
  }

  const handleViewMember = (member) => {
    toast.info(`Viewing profile for ${member.name}`)
  }

  const handleExportRoster = () => {
    toast.success('Department roster exported successfully!')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Roster</h1>
          <p className="text-gray-600 mt-1">
            View all faculty and students in {userProfile?.department || 'your department'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={handleExportRoster}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText className="w-4 h-4" />
            Export Roster
          </motion.button>
          <motion.button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            Add Member
          </motion.button>
        </div>
      </motion.div>

      {/* Department Overview */}
      <motion.div 
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 sm:p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-2">
              {userProfile?.department || 'Civil Engineering'} Department
            </h2>
            <p className="text-indigo-100 mb-4 text-sm sm:text-base">
              Engineering College • Academic Year 2024-25
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-indigo-100">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>Head: {userProfile?.fullName || 'Dr. Jagan Kumar'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{departmentMembers.length} Total Members</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <motion.div 
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Building className="w-10 h-10 text-white/80" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {departmentStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Faculty vs Student Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Faculty Overview</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{facultyMembers.length}</div>
                <div className="text-sm text-gray-600">Total Faculty</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {facultyMembers.reduce((sum, f) => sum + (f.totalReimbursements || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Reimbursements</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Top Contributors</h4>
              {facultyMembers
                .sort((a, b) => (b.totalReimbursements || 0) - (a.totalReimbursements || 0))
                .slice(0, 3)
                .map((faculty, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium">{faculty.name}</div>
                      <div className="text-xs text-gray-600">{faculty.designation}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {faculty.totalReimbursements || 0} requests
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Student Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Student Overview</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{studentMembers.length}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {studentMembers.reduce((sum, s) => sum + (s.totalReimbursements || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Reimbursements</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-xl font-bold text-orange-600">
                  {Math.round((studentMembers.filter(s => s.totalReimbursements > 0).length / studentMembers.length) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Participation</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Year-wise Distribution</h4>
              {(() => {
                const yearGroups = studentMembers.reduce((acc, student) => {
                  const year = student.year || 'Unknown'
                  acc[year] = (acc[year] || 0) + 1
                  return acc
                }, {})
                
                return Object.entries(yearGroups).map(([year, count]) => (
                  <div key={year} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="text-sm font-medium">{year}</div>
                    <div className="text-sm font-semibold text-gray-900">{count} students</div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Member Table */}
      <MemberTable 
        members={departmentMembers}
        title="Complete Department Roster"
      />

      {/* Add Member Modal (placeholder) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="bg-white rounded-lg p-6 w-full max-w-md mx-auto"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Member</h3>
            <p className="text-sm text-gray-600 mb-4">
              This feature would allow adding new faculty or student members to the department roster.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  toast.success('Member would be added to the roster')
                }}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Member
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DepartmentRoster
