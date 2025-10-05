import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

/**
 * ReportPieChart Component
 * Displays pie chart for status distribution with custom tooltips and legends
 * @param {Array} data - Chart data array
 * @param {string} title - Chart title
 * @param {number} height - Chart height
 */
const ReportPieChart = ({ data, title = "Status Distribution", height = 300 }) => {
  const COLORS = {
    'Approved': '#10b981',
    'Pending': '#f59e0b',
    'Rejected': '#ef4444',
    'Processing': '#8b5cf6',
    'Under Principal': '#3b82f6',
    'Under HOD': '#6366f1'
  }

  /**
   * Custom tooltip component for pie chart interactions
   */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Count: {data.count}</p>
          <p className="text-sm text-gray-600">Percentage: {data.value}%</p>
        </div>
      )
    }
    return null
  }

  /**
   * Custom label function for pie chart segments
   */
  const renderLabel = (entry) => {
    return `${entry.value}%`
  }

  /**
   * Custom legend component for pie chart
   */
  const CustomLegend = (props) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">
          Total: {data.reduce((sum, item) => sum + item.count, 0)} requests
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || '#64748b'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[item.name] || '#64748b' }}
              ></div>
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-500">{item.value}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ReportDonutChart Component
 * Alternative donut chart version for status distribution
 * @param {Array} data - Chart data array
 * @param {string} title - Chart title
 * @param {number} height - Chart height
 */
export const ReportDonutChart = ({ data, title = "Status Distribution", height = 300 }) => {
  const COLORS = {
    'Approved': '#10b981',
    'Pending': '#f59e0b',
    'Rejected': '#ef4444',
    'Processing': '#8b5cf6',
    'Under Principal': '#3b82f6',
    'Under HOD': '#6366f1'
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Count: {data.count}</p>
          <p className="text-sm text-gray-600">Percentage: {data.value}%</p>
        </div>
      )
    }
    return null
  }

  const totalRequests = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name] || '#64748b'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalRequests}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-6">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[item.name] || '#64748b' }}
            ></div>
            <span className="text-sm text-gray-600 truncate">{item.name}</span>
            <span className="text-sm font-medium text-gray-900 ml-auto">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReportPieChart