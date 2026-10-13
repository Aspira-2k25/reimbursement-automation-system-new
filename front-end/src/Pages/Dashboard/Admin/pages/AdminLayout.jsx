import ResponsiveSidebar from '../../../../components/ResponsiveSidebar'
import { useState, createContext, useContext, useCallback, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

import { adminAPI } from '../../../../services/api'
import { toast } from 'react-hot-toast'
import FacultyManagement from './FacultyManagement'
import Dashboard from './Dashboard'
import AdminLogs from './AdminLogs'
import PortalManagement from './PortalManagement'
import ChangePassword from '../../../../components/ChangePassword'
import { normalizeDepartment } from '../../../../utils/departmentNormalization'

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
  const location = useLocation()
  const navigate = useNavigate()

  const getTabFromHash = () => {
    const hash = location.hash.replace('#', '')
    return hash || 'home'
  }

  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024)
  const [activeTab, setActiveTab] = useState(getTabFromHash())
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
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
  const fetchStaff = useCallback(async ({ background = false } = {}) => {
    try {
      if (!background) setLoading(true)
      const response = await adminAPI.getFacultyList()
      const staff = response.staff || []
      setStaffList(staff)
      console.log('Fetched staff:', staff.length)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error(error?.error || 'Failed to fetch staff')
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  // Fetch staff on mount
  useEffect(() => {
    fetchStaff()
    const refreshVisible = () => { if (!document.hidden) fetchStaff({ background: true }) }
    const timer = setInterval(refreshVisible, 30000)
    document.addEventListener('visibilitychange', refreshVisible)
    window.addEventListener('focus', refreshVisible)
    window.addEventListener('staff:updated', refreshVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshVisible)
      window.removeEventListener('focus', refreshVisible)
      window.removeEventListener('staff:updated', refreshVisible)
    }
  }, [fetchStaff])

  // Filter faculty based on search, department, and active status
  const filteredFaculty = useMemo(() => {
    return staffList.filter(faculty => {
      const matchesSearch = !searchQuery ||
        faculty.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.role?.toLowerCase().includes(searchQuery.toLowerCase())

      const isCollegeWide = ['principal', 'accounts', 'admin'].includes(faculty.role?.toLowerCase())
      // College-wide roles have no department; they only appear when viewing 'All' departments
      const matchesDepartment = departmentFilter === 'All' || (!isCollegeWide && normalizeDepartment(faculty.department) === departmentFilter)

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && faculty.is_active !== false) ||
        (statusFilter === 'Inactive' && faculty.is_active === false)

      return matchesStatus && matchesSearch && matchesDepartment
    })
  }, [staffList, searchQuery, departmentFilter, statusFilter])

  // Get unique departments (excluding college-wide roles)
  const departments = useMemo(() => {
    const depts = new Set(
      staffList
        .filter(f => !['principal', 'accounts', 'admin'].includes(f.role?.toLowerCase()))
        .map(f => normalizeDepartment(f.department))
        .filter(Boolean)
    )
    return ['All', ...Array.from(depts)]
  }, [staffList])

  // Add new staff member
  const handleAddStaff = useCallback(() => {
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
        const response = await adminAPI.updateFaculty(editingStaff.id, formData)
        toast.success(response?.message || 'Staff updated successfully')
      } else {
        // Create new
        const response = await adminAPI.createFaculty(formData)
        toast.success(response?.message || 'Staff created successfully')
      }
      setShowModal(false)
      setEditingStaff(null)
      fetchStaff()
    } catch (error) {
      console.error('Error saving staff:', error)
      toast.error(error?.error || 'Failed to save staff')
    }
  }, [editingStaff, fetchStaff])

  // Toggle staff active/inactive status
  const handleToggleStaffStatus = useCallback(async (faculty) => {
    const isCurrentlyActive = faculty.is_active !== false
    const newStatus = !isCurrentlyActive
    const actionWord = newStatus ? 'activate' : 'deactivate'
    const name = faculty.name || faculty.username || 'this staff member'
    if (!window.confirm(`Are you sure you want to ${actionWord} the account for ${name}?`)) {
      return
    }
    try {
      await adminAPI.updateFaculty(faculty.id, { is_active: newStatus })
      toast.success(`Staff account ${newStatus ? 'activated' : 'deactivated'} successfully`)
      fetchStaff()
    } catch (error) {
      console.error('Error toggling staff status:', error)
      toast.error(error?.error || `Failed to ${actionWord} staff account`)
    }
  }, [fetchStaff])

  // Delete staff member (permanently)
  const handleDeleteStaff = useCallback(async (id) => {
    const target = staffList.find(s => s.id === id)
    const name = target?.name || target?.username || 'this staff member'
    if (!window.confirm(`Are you sure you want to permanently delete ${name}? This action cannot be undone.`)) {
      return
    }
    try {
      const res = await adminAPI.deleteFaculty(id, { permanent: true })
      toast.success(res?.message || 'Staff member permanently deleted successfully')
      fetchStaff()
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast.error(error?.error || 'Failed to delete staff')
    }
  }, [staffList, fetchStaff])

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
    statusFilter,
    setStatusFilter,
    departments,
    editingStaff,
    setEditingStaff,
    showModal,
    setShowModal,
    handleAddStaff,
    handleEditStaff,
    handleSaveStaff,
    handleToggleStaffStatus,
    handleDeleteStaff,
    refreshStaff: fetchStaff
  }

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="mobile-dashboard-root flex h-screen bg-gray-100">
        {/* Sidebar */}
        <ResponsiveSidebar collapsed={isCollapsed} onCollapse={setIsCollapsed}><Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} /></ResponsiveSidebar>

        {/* Main Content */}
        <div className="mobile-full-content flex-1 min-w-0 flex flex-col overflow-hidden">
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
                className="mobile-page-content p-6"
              >
                {activeTab === 'home' && <Dashboard />}
                {activeTab === 'portals' && <PortalManagement />}
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
