
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
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={11} minTickGap={12} tickMargin={8} />
            <YAxis yAxisId="requests" width={38} allowDecimals={false} domain={[0, 'auto']} stroke="#2563eb" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'Requests', position: 'top', offset: 8, fontSize: 11, fill: '#2563eb' }} />
          <YAxis yAxisId="amount" orientation="right" width={48} domain={[0, 'auto']} stroke="#059669" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value) >= 1000 ? '₹' + Number((Number(value) / 1000).toFixed(1)) + 'k' : '₹' + value} label={{ value: 'Amount (₹)', position: 'top', offset: 8, fontSize: 11, fill: '#059669' }} />
            <Tooltip
              formatter={(value, name, entry) => [
                entry?.dataKey === 'amount' || name === 'Amount (₹)' ? '₹' + Number(value).toLocaleString('en-IN') : Number(value).toLocaleString('en-IN'),
                entry?.dataKey === 'amount' || name === 'Amount (₹)' ? 'Amount (₹)' : 'Requests'
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              yAxisId="requests"
            dataKey="requests"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Requests"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              yAxisId="amount"
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
