import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { format, parseISO, addDays } from 'date-fns'

export default function Forecast() {
  const { user } = useAuth()
  const [horizon, setHorizon] = useState<number>(30)

  const { data: forecastData, isLoading } = useQuery({
    queryKey: ['forecast', horizon],
    queryFn: async () => {
      const response = await api.get('/forecast', {
        params: { horizon }
      })
      return response.data.data
    },
    enabled: user?.tier === 'premium'
  })

  // Prepare chart data
  const chartData = forecastData?.forecast
    ? forecastData.forecast.map((item: any, index: number) => {
        const date = parseISO(item.ds)
        return {
          date: format(date, 'MMM dd'),
          forecast: parseFloat(item.yhat || 0),
          lower: parseFloat(item.yhat_lower || 0),
          upper: parseFloat(item.yhat_upper || 0)
        }
      })
    : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Forecast</h2>
          <p className="text-gray-600">AI-powered revenue predictions using Prophet</p>
        </div>
        {user?.tier === 'premium' && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Forecast Horizon:
              <select
                value={horizon}
                onChange={(e) => setHorizon(parseInt(e.target.value))}
                className="ml-2 input"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {user?.tier !== 'premium' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Premium Feature:</strong> Revenue forecasting is available for Premium subscribers.
            <a href="#" className="ml-2 text-yellow-900 underline">Upgrade now</a>
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating forecast...</p>
        </div>
      ) : forecastData ? (
        <>
          {/* Forecast Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-sm font-medium text-gray-500">Total Forecasted Revenue</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                $
                {forecastData.point_forecast
                  ?.reduce((a: number, b: number) => a + b, 0)
                  .toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }) || '0.00'}
              </div>
              <div className="mt-1 text-xs text-gray-500">Over {horizon} days</div>
            </div>
            <div className="card">
              <div className="text-sm font-medium text-gray-500">Average Daily Revenue</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                $
                {forecastData.point_forecast
                  ? (
                      forecastData.point_forecast.reduce((a: number, b: number) => a + b, 0) /
                      horizon
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                  : '0.00'}
              </div>
            </div>
            <div className="card">
              <div className="text-sm font-medium text-gray-500">Confidence Range</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">80%</div>
              <div className="mt-1 text-xs text-gray-500">Prediction interval</div>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Revenue Forecast with Confidence Intervals</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="#94a3b8"
                  fill="#e2e8f0"
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="#94a3b8"
                  fill="#ffffff"
                  name="Lower Bound"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="Forecast"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Details Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Daily Forecast Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Forecast
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lower Bound
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Upper Bound
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.slice(0, 10).map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.forecast.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.lower.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.upper.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600">
            {user?.tier === 'premium'
              ? 'Select a forecast horizon to generate predictions.'
              : 'Upgrade to Premium to access revenue forecasting.'}
          </p>
        </div>
      )}
    </div>
  )
}

