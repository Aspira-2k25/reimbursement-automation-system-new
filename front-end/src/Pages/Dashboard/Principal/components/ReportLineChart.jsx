import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

/**
 * ReportLineChart Component
 * Displays line chart for trend analysis
 * @param {Array} data - Chart data
 * @param {string} title - Chart title
 * @param {number} height - Chart height
 */
const ReportLineChart = ({ 
  data = [], 
  title = "Trend Analysis", 
  height = 300 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [
                name === 'amount' ? `₹${value.toLocaleString()}` : value,
                name === 'amount' ? 'Amount' : 'Requests'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="requests" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              name="Requests"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#10b981" 
              strokeWidth={2} 
              name="Amount (₹)"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ReportLineChart
