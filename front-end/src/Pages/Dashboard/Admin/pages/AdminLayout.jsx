import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useAuth } from '../../../../context/AuthContext'
import { adminAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import FacultyManagement from './FacultyManagement'
import Dashboard from './Dashboard'
import AdminLogs from './AdminLogs'
import ChangePassword from '../../../../components/ChangePassword'

const DEPARTMENT_ALIASES = {
  'IT': 'Information Technology',
  'CE': 'Computer Engineering',
  'AIML': 'CSE AI and ML',
  'DS': 'CSE Data Science',
  'CIVIL': 'Civil Engineering',
  'MECH': 'Mechanical Engineering',
}

const normalizeDepartment = (dept) => {
  if (!dept) return ''
  const trimmed = dept.trim()
  const upper = trimmed.toUpperCase()
  if (DEPARTMENT_ALIASES[upper]) return DEPARTMENT_ALIASES[upper]
  for (const fullName of Object.values(DEPARTMENT_ALIASES)) {
    if (fullName.toLowerCase() === trimmed.toLowerCase()) return fullName
  }
  return trimmed
}

// Context for sharing Admin state across components
const AdminContext = createContext()

export const useAdminContext = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdminContext must be used within AdminLayout')
  }
  return context
}

const AdminLayout = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const getTabFromHash = () => {
    const hash = location.hash.replace('#', '')
    return hash || 'home'
  }

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState(getTabFromHash())
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [editingStaff, setEditingStaff] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Sync activeTab with URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash && hash !== activeTab) {
      setActiveTab(hash)
    } else if (!hash && activeTab !== 'home') {
      setActiveTab('home')
    }
  }, [location.hash, activeTab])

  // Custom setActiveTab that updates URL
  const handleSetActiveTab = useCallback((tab) => {
    setActiveTab(tab)
    navigate(tab === 'home' ? '/dashboard/admin' : `/dashboard/admin#${tab}`, { replace: false })
  }, [navigate])

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update user profile from AuthContext

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getFacultyList()
      const staff = response.staff || []
      setStaffList(staff)
      console.log('Fetched staff:', staff.length)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error(error?.error || 'Failed to fetch staff')
      setStaffList([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch staff on mount
  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  // Filter faculty based on search and filters
  const filteredFaculty = useMemo(() => {
    return staffList.filter(faculty => {
      const matchesSearch = !searchQuery ||
        faculty.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.email?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment = departmentFilter === 'All' || normalizeDepartment(faculty.department) === departmentFilter

      return matchesSearch && matchesDepartment
    })
  }, [staffList, searchQuery, departmentFilter])

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(staffList.map(f => normalizeDepartment(f.department)).filter(Boolean))
    return ['All', ...Array.from(depts)]
  }, [staffList])

  // Add new staff member
  const handleAddStaff = useCallback((data) => {
    setEditingStaff(null)
    setShowModal(true)
  }, [])

  // Edit staff member
  const handleEditStaff = useCallback((faculty) => {
    setEditingStaff(faculty)
    setShowModal(true)
  }, [])

  // Save staff (add or update)
  const handleSaveStaff = useCallback(async (formData) => {
    try {
      if (editingStaff) {
        // Update existing
        await adminAPI.updateFaculty(editingStaff.id, formData)
        toast.success('Staff updated successfully')
      } else {
        // Create new
        await adminAPI.createFaculty(formData)
        toast.success('Staff created successfully')
      }
      setShowModal(false)
      setEditingStaff(null)
      fetchStaff()
    } catch (error) {
      console.error('Error saving staff:', error)
      toast.error(error?.error || 'Failed to save staff')
    }
  }, [editingStaff, fetchStaff])

  // Delete staff member
  const handleDeleteStaff = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return
    }
    try {
      await adminAPI.deleteFaculty(id)
      toast.success('Staff deleted successfully')
      fetchStaff()
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast.error(error?.error || 'Failed to delete staff')
    }
  }, [fetchStaff])

  const contextValue = {
    activeTab,
    setActiveTab: handleSetActiveTab,
    staffList: filteredFaculty,
    allFaculty: staffList,
    loading,
    searchQuery,
    setSearchQuery,
    departmentFilter,
    setDepartmentFilter,
    departments,
    editingStaff,
    setEditingStaff,
    showModal,
    setShowModal,
    handleAddStaff,
    handleEditStaff,
    handleSaveStaff,
    handleDeleteStaff,
    refreshStaff: fetchStaff
  }

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="p-6"
              >
                {activeTab === 'home' && <Dashboard />}
                {activeTab === 'faculty' && <FacultyManagement />}
                {activeTab === 'logs' && <AdminLogs />}
                {activeTab === 'change-password' && <ChangePassword />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AdminContext.Provider>
  )
}

export default AdminLayout
