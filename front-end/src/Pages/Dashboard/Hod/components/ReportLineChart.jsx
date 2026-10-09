
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

/**
 * ReportLineChart Component
 * Displays line chart for monthly trends with requests and amounts
 * @param {Array} data - Chart data array
 * @param {string} title - Chart title
 * @param {number} height - Chart height
 */
const ReportLineChart = ({ data, title = "Monthly Trend", height = 300 }) => {
  /**
   * Custom tooltip component for chart interactions
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'amount'
                ? `Amount: ₹${Number(entry.value).toLocaleString('en-IN')}`
                : `${entry.name}: ${entry.value}`
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Amount (₹)</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis yAxisId="requests" width={38} allowDecimals={false} domain={[0, 'auto']} stroke="#2563eb" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'Requests', position: 'top', offset: 8, fontSize: 11, fill: '#2563eb' }} />
          <YAxis yAxisId="amount" orientation="right" width={48} domain={[0, 'auto']} stroke="#059669" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value) >= 1000 ? '₹' + Number((Number(value) / 1000).toFixed(1)) + 'k' : '₹' + value} label={{ value: 'Amount (₹)', position: 'top', offset: 8, fontSize: 11, fill: '#059669' }} />
          <Tooltip content={<CustomTooltip />} />

          {/* Requests line */}
          <Line
            type="monotone"
            yAxisId="requests"
            dataKey="requests"
            name="Requests"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
          />

          {/* Amount line */}
          <Line
            type="monotone"
            yAxisId="amount"
            dataKey="amount"
            name="Amount (₹)"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * ReportAreaChart Component
 * Alternative area chart version for monthly trends
 * @param {Array} data - Chart data array
 * @param {string} title - Chart title
 * @param {number} height - Chart height
 */
export const ReportAreaChart = ({ data, title = "Monthly Trend", height = 300 }) => {
  /**
   * Custom tooltip component for area chart
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'amount'
                ? `Amount: ₹${Number(entry.value).toLocaleString('en-IN')}`
                : `${entry.name}: ${entry.value}`
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Amount (₹)</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis yAxisId="requests" width={38} allowDecimals={false} domain={[0, 'auto']} stroke="#2563eb" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'Requests', position: 'top', offset: 8, fontSize: 11, fill: '#2563eb' }} />
          <YAxis yAxisId="amount" orientation="right" width={48} domain={[0, 'auto']} stroke="#059669" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value) >= 1000 ? '₹' + Number((Number(value) / 1000).toFixed(1)) + 'k' : '₹' + value} label={{ value: 'Amount (₹)', position: 'top', offset: 8, fontSize: 11, fill: '#059669' }} />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            yAxisId="requests"
            dataKey="requests"
            name="Requests"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#requestsGradient)"
          />

          <Area
            type="monotone"
            yAxisId="amount"
            dataKey="amount"
            name="Amount (₹)"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#amountGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ReportLineChart