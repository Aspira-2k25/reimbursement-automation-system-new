import React, { useState, useMemo } from 'react'
import { 
  Search, 
  Download, 
  Mail, 
  Phone, 
  Calendar,
  GraduationCap,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

/**
 * MemberTable Component
 * Displays department members with search, filtering, sorting, and pagination
 * @param {Array} members - Array of member objects
 * @param {string} title - Table title
 */
const MemberTable = ({ members = [], title = "Department Members" }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  
  const itemsPerPage = 10

  // Filter and search logic
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.specialization && member.specialization.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.year && member.year.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesType = typeFilter === 'All' || member.type === typeFilter
      
      return matchesSearch && matchesType
    })
  }, [members, searchQuery, typeFilter])

  // Sorting logic
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      
      if (sortConfig.key === 'totalReimbursements') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      if (sortConfig.key === 'joinDate' || sortConfig.key === 'lastReimbursement') {
        const aDate = new Date(aValue)
        const bDate = new Date(bValue)
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
      }
      
      return sortConfig.direction === 'asc' 
        ? (aValue || '').localeCompare(bValue || '')
        : (bValue || '').localeCompare(aValue || '')
    })
    
    return sorted
  }, [filteredMembers, sortConfig])

  // Pagination logic
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage)

  // Get unique types for filter dropdown
  const types = ['All', ...new Set(members.map(m => m.type))]

  /**
   * Handle column sorting
   */
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  /**
   * Handle pagination page change
   */
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  /**
   * Format date string for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  /**
   * Export table data to CSV format
   */
  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Type', 'Designation/Year', 'Department', 'Email', 'Phone', 'Join Date', 'Total Reimbursements']
    const csvContent = [
      headers.join(','),
      ...sortedMembers.map(member => [
        member.id,
        member.name,
        member.type,
        member.type === 'Faculty' ? member.designation : member.year,
        member.department,
        member.email,
        member.phone,
        member.joinDate,
        member.totalReimbursements
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `college-members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {sortedMembers.length} of {members.length} members
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-64"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Member
                {sortConfig.key === 'name' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('designation')}
              >
                Position
                {sortConfig.key === 'designation' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('joinDate')}
              >
                Join Date
                {sortConfig.key === 'joinDate' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalReimbursements')}
              >
                Reimbursements
                {sortConfig.key === 'totalReimbursements' && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                      member.type === 'Student' ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      {member.type === 'Student' ? (
                        <GraduationCap className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.type === 'Student' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {member.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {member.type === 'Faculty' ? member.designation : member.year}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.department}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-32">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />
                      <span>{member.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(member.joinDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {member.totalReimbursements}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last: {formatDate(member.lastReimbursement)}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedMembers.length)} of {sortedMembers.length} results
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedMembers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <User className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-500">
            {searchQuery || typeFilter !== 'All'
              ? 'Try adjusting your search criteria'
              : 'No department members have been added yet'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default MemberTable
