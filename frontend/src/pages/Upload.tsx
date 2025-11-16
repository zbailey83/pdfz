import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const queryClient = useQueryClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setSuccess('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setSuccess(`Successfully uploaded ${response.data.data.rows_processed} rows`)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Invalidate dashboard query to refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Marketing Data</h2>
        <p className="text-gray-600">Upload your CSV file with marketing metrics</p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              CSV should include: date, channel, spend, revenue, impressions, clicks, conversions, new_customers, returning_customers
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={!file || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-4">CSV Template</h3>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-700">
{`date,channel,spend,revenue,impressions,clicks,conversions,new_customers,returning_customers
2025-03-01,Google Ads,120.50,450.00,2000,150,20,5,15
2025-03-02,Facebook Ads,95.00,320.00,1500,120,15,3,12
2025-03-03,LinkedIn Ads,80.00,280.00,800,90,12,2,10`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

