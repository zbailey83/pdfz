import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ErrorBar
} from 'recharts'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Attribution() {
  const { user } = useAuth()
  const [jobId, setJobId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Start attribution job
  const startAttribution = useMutation({
    mutationFn: async () => {
      const response = await api.post('/models/attribution/run', {})
      return response.data.data
    },
    onSuccess: (data) => {
      setJobId(data.job_id)
      queryClient.invalidateQueries({ queryKey: ['attribution', data.job_id] })
    }
  })

  // Poll for attribution results
  const { data: attributionData, isLoading: isLoadingResult } = useQuery({
    queryKey: ['attribution', jobId],
    queryFn: async () => {
      if (!jobId) return null
      const response = await api.get(`/models/attribution/${jobId}`)
      // Backend returns { status: 'success', data: {...} } or { status: 'pending', message: ... }
      if (response.data.status === 'success' && response.data.data) {
        return { status: 'completed', data: response.data.data }
      }
      return response.data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as any
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds
    }
  })

  const status = attributionData?.status
  const result = attributionData?.data

  // Prepare chart data
  const roasData = result?.marginal_roas
    ? Object.entries(result.marginal_roas).map(([channel, roas]: [string, any]) => ({
        channel,
        roas: parseFloat(roas.toFixed(2)),
        lower: result.confidence_intervals?.[channel]?.lower || roas * 0.9,
        upper: result.confidence_intervals?.[channel]?.upper || roas * 1.1
      }))
    : []

  const contributionData = result?.contributions
    ? Object.entries(result.contributions).map(([channel, contribution]: [string, any]) => ({
        name: channel,
        value: Math.abs(parseFloat(contribution.toFixed(2)))
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing Attribution</h2>
          <p className="text-gray-600">AI-powered multi-touch attribution analysis</p>
        </div>
        {user?.tier === 'premium' && (
          <button
            onClick={() => startAttribution.mutate()}
            disabled={startAttribution.isPending || status === 'processing'}
            className="btn btn-primary"
          >
            {startAttribution.isPending || status === 'processing'
              ? 'Running Attribution...'
              : 'Run Attribution Analysis'}
          </button>
        )}
      </div>

      {user?.tier !== 'premium' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Premium Feature:</strong> Attribution analysis is available for Premium subscribers.
            <a href="#" className="ml-2 text-yellow-900 underline">Upgrade now</a>
          </p>
        </div>
      )}

      {status === 'pending' || status === 'processing' ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {status === 'pending' ? 'Queuing attribution job...' : 'Processing attribution model...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      ) : status === 'failed' ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Attribution analysis failed. Please try again.
        </div>
      ) : result ? (
        <>
          {/* Model Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-sm font-medium text-gray-500">Model R²</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {(result.r_squared * 100).toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {result.r_squared >= 0.7 ? '✓ Good fit' : '⚠ Low fit'}
              </div>
            </div>
            <div className="card">
              <div className="text-sm font-medium text-gray-500">MAPE</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {result.mape?.toFixed(1) || 'N/A'}%
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {result.mape < 20 ? '✓ Accurate' : '⚠ High error'}
              </div>
            </div>
            <div className="card">
              <div className="text-sm font-medium text-gray-500">Data Points</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {result.n_samples?.toLocaleString() || 'N/A'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Days analyzed</div>
            </div>
          </div>

          {/* Marginal ROAS Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Marginal ROAS by Channel</h3>
            <p className="text-sm text-gray-600 mb-4">
              Shows the incremental revenue per dollar spent for each channel (with 95% confidence intervals)
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={roasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis label={{ value: 'ROAS', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}x`}
                  labelFormatter={(label) => `Channel: ${label}`}
                />
                <Legend />
                <Bar dataKey="roas" fill="#0ea5e9" name="Marginal ROAS">
                  {roasData.map((entry: any, index: number) => (
                    <ErrorBar
                      key={index}
                      dataKey="roas"
                      width={4}
                      strokeWidth={2}
                      stroke="#666"
                      direction="y"
                      value={[entry.lower, entry.upper]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Contribution Pie Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Revenue Contribution by Channel</h3>
            <p className="text-sm text-gray-600 mb-4">
              Shows each channel's contribution to total revenue
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={contributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contributionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Details Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Channel Attribution Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Marginal ROAS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ROAS CI (95%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue Contribution
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(result.marginal_roas || {}).map(([channel, roas]: [string, any]) => {
                    const ci = result.confidence_intervals?.[channel]
                    const contribution = result.contributions?.[channel] || 0
                    return (
                      <tr key={channel}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {channel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {parseFloat(roas).toFixed(2)}x
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ci
                            ? `${ci.lower.toFixed(2)}x - ${ci.upper.toFixed(2)}x`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${Math.abs(contribution).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Explanation */}
          <div className="card bg-blue-50 border border-blue-200">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">How to Interpret These Results</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
              <li>
                <strong>Marginal ROAS:</strong> The incremental revenue generated per dollar spent on each channel.
                Higher values indicate more efficient channels.
              </li>
              <li>
                <strong>Confidence Intervals:</strong> The range of likely ROAS values (95% confidence). Wider
                intervals indicate more uncertainty.
              </li>
              <li>
                <strong>Revenue Contribution:</strong> The total revenue attributed to each channel based on the
                model.
              </li>
              <li>
                <strong>R² Score:</strong> Measures how well the model fits your data. Values above 0.7 indicate
                a good fit.
              </li>
            </ul>
          </div>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600">
            Click "Run Attribution Analysis" to generate attribution insights for your marketing data.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Requires at least 60 days of historical data.
          </p>
        </div>
      )}
    </div>
  )
}

