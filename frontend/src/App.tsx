import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Attribution from './pages/Attribution'
import Optimizer from './pages/Optimizer'
import Forecast from './pages/Forecast'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <Upload />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attribution"
            element={
              <ProtectedRoute>
                <Layout>
                  <Attribution />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/optimizer"
            element={
              <ProtectedRoute>
                <Layout>
                  <Optimizer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute>
                <Layout>
                  <Forecast />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

