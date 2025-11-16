import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  LineChart,
  Line
} from 'recharts'

export default function Optimizer() {
  const { user } = useAuth()
  const [budget, setBudget] = useState<string>('10000')
  const [minSpend, setMinSpend] = useState<Record<string, string>>({})
  const [maxSpend, setMaxSpend] = useState<Record<string, string>>({})
  const [scenarios, setScenarios] = useState<Array<Record<string, number>>>([])

  // Run optimization
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const constraints: any = {}
      if (Object.keys(minSpend).length > 0) {
        constraints.min_spend = Object.fromEntries(
          Object.entries(minSpend).map(([k, v]) => [k, parseFloat(v) || 0])
        )
      }
      if (Object.keys(maxSpend).length > 0) {
        constraints.max_spend = Object.fromEntries(
          Object.entries(maxSpend).map(([k, v]) => [k, parseFloat(v) || 0])
        )
      }

      const response = await api.post('/optimizer/run', {
        budget: parseFloat(budget),
        constraints
      })
      return response.data.data
    }
  })

  // Get attribution data for channel list
  const { data: attributionData } = useQuery({
    queryKey: ['attribution-latest'],
    queryFn: async () => {
      // This would fetch the latest attribution results
      // For now, return empty
      return null
    },
    enabled: false
  })

  const result = optimizeMutation.data
  const channels = result
    ? Object.keys(result.recommendations || {})
    : ['Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'Twitter Ads']

  // Prepare comparison data
  const comparisonData = result
    ? Object.entries(result.recommendations || {}).map(([channel, spend]: [string, any]) => ({
        channel,
        recommended: parseFloat(spend),
        current: 0 // Would fetch from current allocation
      }))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Budget Optimizer</h2>
        <p className="text-gray-600">AI-powered budget allocation recommendations</p>
      </div>

      {user?.tier !== 'premium' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Premium Feature:</strong> Budget optimization is available for Premium subscribers.
            <a href="#" className="ml-2 text-yellow-900 underline">Upgrade now</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Optimization Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget ($)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="input"
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Spend per Channel (Optional)
              </label>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">{channel}:</span>
                    <input
                      type="number"
                      value={minSpend[channel] || ''}
                      onChange={(e) =>
                        setMinSpend({ ...minSpend, [channel]: e.target.value })
                      }
                      className="input flex-1"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Spend per Channel (Optional)
              </label>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">{channel}:</span>
                    <input
                      type="number"
                      value={maxSpend[channel] || ''}
                      onChange={(e) =>
                        setMaxSpend({ ...maxSpend, [channel]: e.target.value })
                      }
                      className="input flex-1"
                      placeholder="Unlimited"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending || !budget}
              className="btn btn-primary w-full"
            >
              {optimizeMutation.isPending ? 'Optimizing...' : 'Optimize Budget'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Optimization Results</h3>

          {optimizeMutation.isPending ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Optimizing budget allocation...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Expected Revenue</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${result.expected_revenue?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Expected ROI</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(result.expected_roi * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recommended Allocation</h4>
                <div className="space-y-2">
                  {Object.entries(result.recommendations || {}).map(
                    ([channel, spend]: [string, any]) => (
                      <div key={channel} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{channel}</span>
                        <span className="font-medium">
                          ${parseFloat(spend).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Enter parameters and click "Optimize Budget" to see recommendations
            </div>
          )}
        </div>
      </div>

      {/* Allocation Chart */}
      {result && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recommended vs Current Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="recommended" fill="#0ea5e9" name="Recommended" />
              <Bar dataKey="current" fill="#94a3b8" name="Current" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

