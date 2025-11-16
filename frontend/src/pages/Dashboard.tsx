import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/data/summary')
      return response.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load dashboard data
      </div>
    )
  }

  const summary = data?.summary || {}
  const timeSeries = data?.time_series || []

  // Aggregate time series by date
  const dailyData = timeSeries.reduce((acc: any, item: any) => {
    const existing = acc.find((d: any) => d.date === item.date)
    if (existing) {
      existing.spend += item.spend
      existing.revenue += item.revenue
    } else {
      acc.push({ date: item.date, spend: item.spend, revenue: item.revenue })
    }
    return acc
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Marketing performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Spend</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${summary.total_spend?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${summary.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Blended ROAS</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {summary.blended_roas?.toFixed(2) || '0.00'}x
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-500">Total Conversions</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {summary.total_conversions?.toLocaleString() || '0'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Spend vs Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spend" stroke="#0ea5e9" name="Spend" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">ROAS by Channel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.channels || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="roas" fill="#0ea5e9" name="ROAS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Breakdown Table */}
      {summary.channels && summary.channels.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Channel Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.channels.map((channel: any) => (
                  <tr key={channel.channel}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {channel.channel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${channel.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${channel.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {channel.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

