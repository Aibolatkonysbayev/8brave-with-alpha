import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import QuestionBank from './pages/QuestionBank'
import Assessments from './pages/Assessments'
import TakeAssessment from './pages/TakeAssessment'
import Results from './pages/Results'
import LearningPath from './pages/LearningPath'
import Login from './pages/Login'
import Register from './pages/Register'

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" />
  }

  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/questions" element={
          <ProtectedRoute adminOnly>
            <QuestionBank />
          </ProtectedRoute>
        } />
        <Route path="/assessments" element={
          <ProtectedRoute>
            <Assessments />
          </ProtectedRoute>
        } />
        <Route path="/assessment/:id" element={
          <ProtectedRoute>
            <TakeAssessment />
          </ProtectedRoute>
        } />
        <Route path="/results" element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        } />
        <Route path="/learning" element={
          <ProtectedRoute>
            <LearningPath />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
