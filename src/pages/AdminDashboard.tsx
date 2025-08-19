import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, FileQuestion, ClipboardList, TrendingUp, Database, Upload } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalQuestions: number
  totalAssessments: number
  totalCategories: number
  recentActivity: Array<{
    date: string
    assessments: number
    users: number
  }>
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalQuestions: 0,
    totalAssessments: 0,
    totalCategories: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      // Fetch counts
      const [usersResult, questionsResult, assessmentsResult, categoriesResult] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('skill_categories').select('id', { count: 'exact', head: true })
      ])

      // Fetch recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: recentAssessments } = await supabase
        .from('user_assessments')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: recentUsers } = await supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())

      // Group by date
      const activityByDate = new Map()
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        activityByDate.set(dateStr, { date: dateStr, assessments: 0, users: 0 })
      }

      recentAssessments?.forEach(assessment => {
        const date = assessment.created_at.split('T')[0]
        if (activityByDate.has(date)) {
          activityByDate.get(date).assessments++
        }
      })

      recentUsers?.forEach(user => {
        const date = user.created_at.split('T')[0]
        if (activityByDate.has(date)) {
          activityByDate.get(date).users++
        }
      })

      setStats({
        totalUsers: usersResult.count || 0,
        totalQuestions: questionsResult.count || 0,
        totalAssessments: assessmentsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        recentActivity: Array.from(activityByDate.values())
      })

    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your skills assessment platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileQuestion className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Questions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClipboardList className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Database className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.recentActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Line 
              type="monotone" 
              dataKey="assessments" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Assessments"
            />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="#10B981" 
              strokeWidth={2}
              name="New Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-900">Upload Questions</h3>
              <p className="text-blue-700 text-sm">Import questions via CSV</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileQuestion className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-green-900">Manage Questions</h3>
              <p className="text-green-700 text-sm">Edit question bank</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-purple-900">Analytics</h3>
              <p className="text-purple-700 text-sm">View detailed reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
