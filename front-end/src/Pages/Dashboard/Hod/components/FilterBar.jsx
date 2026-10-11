import { useId, useState, useMemo, useEffect } from "react";
import { Filter, Download, RefreshCw, Calendar, Tag, UserCheck, CheckCircle2, Building, X } from 'lucide-react';

/**
 * FilterBar Component
 * Structured, dynamic filtering and search bar for reviewer dashboards.
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
  departments = [],
  currentCategory,
  currentMemberType,
  currentStatus,
  currentDepartment,
  currentDateRange
}) => {
  const filterId = useId();
  const [dateRange, setDateRange] = useState(currentDateRange || { startDate: '', endDate: '' });
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'All');
  const [selectedMemberType, setSelectedMemberType] = useState(currentMemberType || 'All');
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'All');
  const [selectedDepartment, setSelectedDepartment] = useState(currentDepartment || 'All');

  // Sync with controlled props if provided
  useEffect(() => {
    if (currentCategory !== undefined) setSelectedCategory(currentCategory);
  }, [currentCategory]);
  useEffect(() => {
    if (currentMemberType !== undefined) setSelectedMemberType(currentMemberType);
  }, [currentMemberType]);
  useEffect(() => {
    if (currentStatus !== undefined) setSelectedStatus(currentStatus);
  }, [currentStatus]);
  useEffect(() => {
    if (currentDepartment !== undefined) setSelectedDepartment(currentDepartment);
  }, [currentDepartment]);
  useEffect(() => {
    if (currentDateRange !== undefined) setDateRange(currentDateRange);
  }, [currentDateRange]);

  // Dynamically compute available categories based on selected member type
  const dynamicCategories = useMemo(() => {
    if (selectedMemberType === 'Student') {
      return ['NPTEL'];
    }
    if (selectedMemberType === 'Faculty') {
      const filtered = categories.filter(c => c && c !== 'All');
      return filtered.length > 0 ? filtered : ['NPTEL', 'FDP', 'Conference', 'Workshop'];
    }
    // All
    const all = categories.filter(c => c && c !== 'All');
    return all.length > 0 ? all : ['NPTEL', 'FDP', 'Conference', 'Workshop'];
  }, [selectedMemberType, categories]);

  const handleDateChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    if (onDateRangeChange) onDateRangeChange(newDateRange);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    if (onCategoryChange) onCategoryChange(value);
  };

  const handleMemberTypeChange = (value) => {
    setSelectedMemberType(value);
    if (onMemberTypeChange) onMemberTypeChange(value);

    // If switching to Student and current category is not valid for Student, reset to All
    if (value === 'Student' && selectedCategory !== 'All' && selectedCategory !== 'NPTEL') {
      setSelectedCategory('All');
      if (onCategoryChange) onCategoryChange('All');
    }
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    if (onStatusChange) onStatusChange(value);
  };

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    if (onDepartmentChange) onDepartmentChange(value);
  };

  const clearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedCategory('All');
    setSelectedMemberType('All');
    setSelectedStatus('All');
    setSelectedDepartment('All');

    if (onDateRangeChange) onDateRangeChange({ startDate: '', endDate: '' });
    if (onCategoryChange) onCategoryChange('All');
    if (onMemberTypeChange) onMemberTypeChange('All');
    if (onStatusChange) onStatusChange('All');
    if (onDepartmentChange) onDepartmentChange('All');
  };

  const hasActiveFilters = Boolean(
    dateRange.startDate || dateRange.endDate ||
    selectedCategory !== 'All' || selectedMemberType !== 'All' ||
    selectedStatus !== 'All' || selectedDepartment !== 'All'
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Filter & Refine</h3>
            <p className="text-xs text-gray-500">Live dynamic filters across reimbursement claims</p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        )}
      </div>

      {/* Row 1: Primary Dimensions (Member Type, Category, Status, Department) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Member Type Filter */}
        <div>
          <label htmlFor={filterId + '-member-type'} className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Member Type
          </label>
          <select
            aria-label="Member Type"
            id={filterId + '-member-type'}
            value={selectedMemberType}
            onChange={(e) => handleMemberTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all"
          >
            {memberTypes.map(type => (
              <option key={type} value={type}>{type === 'All' ? 'All Member Types' : type}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Category Filter */}
        <div>
          <label htmlFor={filterId + '-category'} className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Category {selectedMemberType !== 'All' && <span className="text-[10px] text-teal-600 font-normal">({selectedMemberType})</span>}
          </label>
          <select
            aria-label="Category"
            id={filterId + '-category'}
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all"
          >
            <option value="All">All Categories</option>
            {dynamicCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor={filterId + '-status'} className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Status
          </label>
          <select
            aria-label="Status"
            id={filterId + '-status'}
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all"
          >
            <option value="All">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Department Filter (if applicable) */}
        {departments.length > 0 && (
          <div>
            <label htmlFor={filterId + '-department'} className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Department
            </label>
            <select
              aria-label="Department"
              id={filterId + '-department'}
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row 2: Date Range & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 pt-2 border-t border-gray-100 items-end">
        {/* Date Range Inputs */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={filterId + '-start'} className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              From Date
            </label>
            <input
              aria-label="start Date"
              id={filterId + '-start'}
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
            />
          </div>
          <div>
            <label htmlFor={filterId + '-end'} className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              To Date
            </label>
            <input
              aria-label="end Date"
              id={filterId + '-end'}
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="lg:col-span-4 flex items-center justify-start lg:justify-end gap-2.5">
          <button
            onClick={onRefresh}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200/80 rounded-lg transition-colors border border-gray-200/60 shadow-sm"
            aria-label="Refresh data"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onExport}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
            aria-label="Export data"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active:</span>

            {selectedMemberType !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-medium rounded-full">
                Type: {selectedMemberType}
                <button
                  onClick={() => handleMemberTypeChange('All')}
                  className="hover:text-purple-900 ml-0.5"
                  title="Remove type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200/60 text-xs font-medium rounded-full">
                Category: {selectedCategory}
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="hover:text-teal-900 ml-0.5"
                  title="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-medium rounded-full">
                Status: {selectedStatus}
                <button
                  onClick={() => handleStatusChange('All')}
                  className="hover:text-amber-900 ml-0.5"
                  title="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDepartment !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-medium rounded-full">
                Dept: {selectedDepartment}
                <button
                  onClick={() => handleDepartmentChange('All')}
                  className="hover:text-blue-900 ml-0.5"
                  title="Remove department filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRange.startDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium rounded-full">
                From: {dateRange.startDate}
                <button
                  onClick={() => handleDateChange('startDate', '')}
                  className="hover:text-emerald-900 ml-0.5"
                  title="Remove start date"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRange.endDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium rounded-full">
                To: {dateRange.endDate}
                <button
                  onClick={() => handleDateChange('endDate', '')}
                  className="hover:text-emerald-900 ml-0.5"
                  title="Remove end date"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;