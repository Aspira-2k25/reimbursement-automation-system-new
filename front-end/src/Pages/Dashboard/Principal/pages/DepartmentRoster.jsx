import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  GraduationCap,
  User,
  Plus,
  FileText,
  TrendingUp,
  Building,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import StatCard from '../components/StatCard'
import MemberTable from '../components/MemberTable'
import { usePrincipalContext } from './PrincipalLayout'
import { userAPI } from '../../../../services/api' // Adjust path if needed

// Helper to expand known department acronyms
const formatDepartmentName = (dept) => {
  if (!dept) return 'N/A';
  const d = dept.toUpperCase().trim();
  if (d === 'IT') return 'Information Technology';
  if (d === 'CSE' || d === 'COMP' || d === 'CE') return 'Computer Engineering';
  if (d === 'MECH' || d === 'ME') return 'Mechanical Engineering';
  if (d === 'CIVIL') return 'Civil Engineering';
  if (d === 'AIML' || d === 'AI&ML' || d === 'CSE(AIML)') return 'CSE AI and ML';
  if (d === 'DS' || d === 'CSE(DS)') return 'CSE Data Science';
  return dept;
};

const DepartmentRoster = () => {
  const { allRequests, userProfile } = usePrincipalContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')

  // State to hold fetched API users
  const [apiUsers, setApiUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState(null)

  // Fetch real users from backend when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true)
        setUsersError(null)
        const response = await userAPI.getAllUsers()
        // api.js already returns response.data, so response is the JSON body here
        const usersData = response.staff || response.users || (Array.isArray(response) ? response : [])

        // Map backend users to UI expected structure
        const formattedUsers = usersData.map(user => ({
          id: user.id || user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A', // Assuming backend might provide phone eventually
          designation: user.role === 'HOD' ? 'Head of Department' : user.role === 'Principal' ? 'Principal' : (user.designation || 'Faculty Member'),
          type: user.role === 'Student' ? 'Student' : 'Faculty',
          department: formatDepartmentName(user.department),
          departmentId: user.department ? user.department.toLowerCase().replace(/\s+/g, '-') : 'general',
          joinDate: user.created_at || user.createdAt || 'N/A',
          isActive: user.is_active !== false, // Default to true if not explicitly false
          totalReimbursements: 0, // Requires a separate API or aggregation to get real numbers
          lastReimbursement: 'N/A',
          // Student specific fields if applicable
          year: user.year || 'N/A'
        }))

        setApiUsers(formattedUsers)
      } catch (error) {
        console.error("Error fetching users for roster:", error)
        setUsersError("Failed to load department members. Please try again later.")
        toast.error("Failed to load roster data")
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  // Create unique list of departments from fetched users
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(apiUsers.map(user => user.department).filter(d => d && d !== 'N/A'))
    return Array.from(depts).map((name, index) => ({ id: `dept-${index}`, name }))
  }, [apiUsers])

  // Replace mock allMembers with fetched and formatted API users
  const allMembers = apiUsers

  // Calculate college-wide statistics dynamically based on real data
  const collegeStats = useMemo(() => {
    const facultyMembers = allMembers.filter(m => m.type === 'Faculty')
    const studentMembers = allMembers.filter(m => m.type === 'Student')

    const totalFaculty = facultyMembers.length
    const totalStudents = studentMembers.length
    const totalMembers = allMembers.length
    const totalRequests = allRequests?.length || 0

    return [
      {
        title: "Total Members",
        value: totalMembers.toString(),
        subtitle: `Faculty: ${totalFaculty} | Students: ${totalStudents}`,
        icon: Users,
        color: 'green',
        trend: { direction: 'up', value: 'Active' }
      },
      {
        title: "Faculty Members",
        value: totalFaculty.toString(),
        subtitle: "Active teaching staff",
        icon: User,
        color: 'green'
      },
      {
        title: "Students",
        value: totalStudents.toString(),
        subtitle: "Enrolled students",
        icon: GraduationCap,
        color: 'green'
      },
      {
        title: "Total Requests",
        value: totalRequests.toString(),
        subtitle: "Across all departments",
        icon: FileText,
        color: 'green',
        trend: { direction: 'up', value: 'Real-time' }
      }
    ]
  }, [allMembers, allRequests])


  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    return allMembers.filter(member => {
      const matchesSearch = !searchQuery ||
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.year?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment = selectedDepartment === 'All' || member.department === selectedDepartment
      const matchesType = selectedType === 'All' || member.type === selectedType
      const matchesYear = selectedYear === 'All' || member.year === selectedYear

      return matchesSearch && matchesDepartment && matchesType && matchesYear
    })
  }, [allMembers, searchQuery, selectedDepartment, selectedType, selectedYear])

  // Faculty and Student breakdown
  const facultyMembersList = useMemo(() =>
    filteredMembers.filter(m => m.type === 'Faculty'), [filteredMembers]
  )

  const studentMembersList = useMemo(() =>
    filteredMembers.filter(m => m.type === 'Student'), [filteredMembers]
  )

  const handleAddMember = () => {
    setShowAddModal(true)
    toast('Add member functionality would be implemented here')
  }

  const handleViewMember = (member) => {
    toast(`Viewing profile for ${member.name}`)
  }

  const handleExportRoster = () => {
    toast.success('Roster export started...')
    // Basic CSV Export implementation
    if (filteredMembers.length === 0) {
      toast.error('No members to export')
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Department,Type,Designation,Join Date\n";

    filteredMembers.forEach(user => {
      const row = `${user.name},${user.email},${user.department},${user.type},${user.designation},${user.joinDate}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "department_roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            View all faculty and students across all departments
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={handleExportRoster}
            disabled={isLoadingUsers || filteredMembers.length === 0}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${isLoadingUsers || filteredMembers.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}
            whileHover={{ scale: (isLoadingUsers || filteredMembers.length === 0) ? 1 : 1.05 }}
            whileTap={{ scale: (isLoadingUsers || filteredMembers.length === 0) ? 1 : 0.95 }}
          >
            <Download className="w-4 h-4" />
            Export Roster
          </motion.button>
        </div>
      </motion.div>

      {/* Principal & College Overview */}
      <motion.div
        className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg p-4 sm:p-6 text-white shadow-lg relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-10 -mb-10 w-32 h-32 bg-emerald-900 opacity-20 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Principal &amp; College Overview</h2>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

            {/* Principal Picture / Avatar */}
            <div className="flex-shrink-0">
              {userProfile?.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile?.fullName || 'Principal'}
                  className="w-24 h-24 rounded-full border-4 border-green-300 object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-700 border-4 border-green-300 flex items-center justify-center shadow-md">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            {/* Principal Profile Details */}
            <div className="flex-1">
              {!userProfile ? (
                <div className="bg-white/10 p-3 rounded-lg border border-white/20 inline-flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium">Principal data not available</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {userProfile?.fullName || userProfile?.name || 'Name not provided'}
                  </h3>
                  <div className="text-green-100 font-medium text-lg">
                    {userProfile?.role === 'Principal' ? 'Principal' : (userProfile?.role || 'Administrator')}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 mt-3 text-sm text-green-50">
                    {userProfile?.department && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 opacity-80" />
                        <span>Dept: {userProfile.department}</span>
                      </div>
                    )}
                    {(userProfile?.email || userProfile?.emailAddress) && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 opacity-80" />
                        <span>{userProfile.email || userProfile.emailAddress}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 opacity-80" />
                      <span>Managing {isLoadingUsers ? '...' : allMembers.length} Members</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side decorative/status icon */}
            <div className="hidden lg:flex flex-col items-center justify-center pl-6 border-l border-white/20">
              <motion.div
                className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Building className="w-8 h-8 text-white" />
              </motion.div>
              <span className="text-xs font-medium text-green-100 uppercase tracking-wider">Institution</span>
            </div>

          </div>
        </div>
      </motion.div>

      {/* College Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {collegeStats.map((stat, index) => (
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
                <div className="text-xl font-bold text-green-600">
                  {isLoadingUsers ? '...' : facultyMembersList.length}
                </div>
                <div className="text-sm text-gray-600">Total Faculty</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  --
                </div>
                <div className="text-sm text-gray-600">Requests</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Recent Faculty Joins</h4>
              {isLoadingUsers ? (
                <div className="text-center py-4 text-sm text-gray-500">Loading faculty data...</div>
              ) : facultyMembersList.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">No faculty members found</div>
              ) : (
                facultyMembersList
                  .slice(0, 3)
                  .map((faculty, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium">{faculty.name}</div>
                        <div className="text-xs text-gray-600">{faculty.department}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {faculty.designation}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Student Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Student Overview</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {isLoadingUsers ? '...' : studentMembersList.length}
                </div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  --
                </div>
                <div className="text-sm text-gray-600">Requests</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {studentMembersList.length > 0 ? 'Active' : '--'}
                </div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Recent Student Joins</h4>
              {isLoadingUsers ? (
                <div className="text-center py-4 text-sm text-gray-500">Loading student data...</div>
              ) : studentMembersList.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">No student members found</div>
              ) : (
                studentMembersList
                  .slice(0, 3)
                  .map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium">{student.name}</div>
                        <div className="text-xs text-gray-600">{student.department}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {student.email}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Members</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, department..."
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Member Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="All">All Types</option>
              <option value="Faculty">Faculty</option>
              <option value="Student">Student</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={selectedType === 'Faculty'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="All">All Years</option>
              <option value="FE">FE (First Year)</option>
              <option value="SE">SE (Second Year)</option>
              <option value="TE">TE (Third Year)</option>
              <option value="BE">BE (Final Year)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conditional Rendering for Member Table based on API state */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoadingUsers ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading department roster...</p>
          </div>
        ) : usersError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Roster</h3>
            <p className="text-gray-600 mb-4">{usersError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-600">Adjust your search or filter criteria.</p>
          </div>
        ) : (
          <MemberTable
            members={filteredMembers}
            title="Complete College Roster"
          />
        )}
      </div>

    </div>
  )
}

export default DepartmentRoster
