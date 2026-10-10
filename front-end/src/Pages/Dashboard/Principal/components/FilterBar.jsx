import { useId, useState } from "react";
import { Filter, Download, RefreshCw } from 'lucide-react'

/**
 * FilterBar Component
 * Provides filtering and search functionality for data tables
 * @param {Function} onDateRangeChange - Callback for date range changes
 * @param {Function} onCategoryChange - Callback for category filter changes
 * @param {Function} onMemberTypeChange - Callback for member type filter changes
 * @param {Function} onStatusChange - Callback for status filter changes
 * @param {Function} onDepartmentChange - Callback for department filter changes
 * @param {Function} onExport - Callback for export action
 * @param {Function} onRefresh - Callback for refresh action
 * @param {Array} categories - Available categories for filtering
 * @param {Array} statuses - Available statuses for filtering
 * @param {Array} memberTypes - Available member types for filtering
 * @param {Array} departments - Available departments for filtering
 */
const FilterBar = ({
  onDateRangeChange,
  onCategoryChange,
  onMemberTypeChange,
  onStatusChange,
  onDepartmentChange,
  onExport,
  onRefresh,
  categories = [],
  statuses = [],
  memberTypes = ['All', 'Faculty', 'Student'],
  departments = []
}) => {
  const filterId = useId()
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedMemberType, setSelectedMemberType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDepartment, setSelectedDepartment] = useState('All')

  /**
   * Handle date range changes
   */
  const handleDateChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value }
    setDateRange(newDateRange)
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange)
    }
  }

  /**
   * Handle category filter changes
   */
  const handleCategoryChange = (value) => {
    setSelectedCategory(value)
    if (onCategoryChange) {
      onCategoryChange(value)
    }
  }

  /**
   * Handle member type filter changes
   */
  const handleMemberTypeChange = (value) => {
    setSelectedMemberType(value)
    if (onMemberTypeChange) {
      onMemberTypeChange(value)
    }
  }

  /**
   * Handle status filter changes
   */
  const handleStatusChange = (value) => {
    setSelectedStatus(value)
    if (onStatusChange) {
      onStatusChange(value)
    }
  }

  /**
   * Handle department filter changes
   */
  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value)
    if (onDepartmentChange) {
      onDepartmentChange(value)
    }
  }

  /**
   * Clear all active filters
   */
  const clearFilters = () => {
    setDateRange({ startDate: '', endDate: '' })
    setSelectedCategory('All')
    setSelectedMemberType('All')
    setSelectedStatus('All')
    setSelectedDepartment('All')

    if (onDateRangeChange) onDateRangeChange({ startDate: '', endDate: '' })
    if (onCategoryChange) onCategoryChange('All')
    if (onMemberTypeChange) onMemberTypeChange('All')
    if (onStatusChange) onStatusChange('All')
    if (onDepartmentChange) onDepartmentChange('All')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filter & Search</h3>
        <button
          onClick={clearFilters}
          className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 [&>div]:min-w-0 [&>fieldset]:min-w-0">
        {/* Date Range */}
        <fieldset className="sm:col-span-2">
          <legend className="block text-sm font-medium text-gray-700 mb-2">Date Range</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="min-w-0">
              <label htmlFor={filterId + '-start'} className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input aria-label="start Date" id={filterId + '-start'} type="date" value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="min-w-0">
              <label htmlFor={filterId + '-end'} className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <input aria-label="end Date" id={filterId + '-end'} type="date" value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
        </fieldset>

        {/* Category Filter */}
        <div>
          <label htmlFor={filterId + '-category'} className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select aria-label="Category" id={filterId + '-category'}
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="All">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Member Type Filter */}
        <div>
          <label htmlFor={filterId + '-member-type'} className="block text-sm font-medium text-gray-700 mb-2">
            Member Type
          </label>
          <select aria-label="Member Type" id={filterId + '-member-type'}
            value={selectedMemberType}
            onChange={(e) => handleMemberTypeChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {memberTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor={filterId + '-status'} className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select aria-label="Status" id={filterId + '-status'}
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="All">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor={filterId + '-department'} className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <select aria-label="Department" id={filterId + '-department'}
            value={selectedDepartment}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="All">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <span className="block text-sm font-medium text-gray-700 mb-2">Actions</span>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Refresh data"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onExport}
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Export data"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>

          {dateRange.startDate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              From: {new Date(dateRange.startDate).toLocaleDateString()}
            </span>
          )}

          {dateRange.endDate && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              To: {new Date(dateRange.endDate).toLocaleDateString()}
            </span>
          )}

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Category: {selectedCategory}
            </span>
          )}

          {selectedMemberType !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Type: {selectedMemberType}
            </span>
          )}

          {selectedStatus !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              Status: {selectedStatus}
            </span>
          )}

          {selectedDepartment !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
              Department: {selectedDepartment}
            </span>
          )}

          {(dateRange.startDate || dateRange.endDate || selectedCategory !== 'All' || selectedMemberType !== 'All' || selectedStatus !== 'All' || selectedDepartment !== 'All') ? null : (
            <span className="text-sm text-gray-500">No filters applied</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilterBar
