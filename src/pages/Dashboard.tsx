import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, UserAssessment, UserProgress } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Trophy, Target, BookOpen, TrendingUp, Clock, Award } from 'lucide-react'

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth()
  const [recentAssessments, setRecentAssessments] = useState<UserAssessment[]>([])
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [stats, setStats] = useState({
    totalAssessments: 0,
    avgScore: 0,
    completedModules: 0,
    timeSpent: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      // Fetch recent assessments
      const { data: assessments } = await supabase
        .from('user_assessments')
        .select(`
          *,
          assessments (
            title,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5)

      setRecentAssessments(assessments || [])

      // Fetch learning progress
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select(`
          *,
          learning_modules (
            title,
            skill_categories (
              name,
              color
            )
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      setProgress(userProgress || [])

      // Calculate stats
      const totalAssessments = assessments?.length || 0
      const avgScore = assessments?.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / Math.max(totalAssessments, 1)
      const completedModules = userProgress?.filter(p => p.status === 'completed').length || 0
      const timeSpent = assessments?.reduce((acc, curr) => acc + (curr.time_taken || 0), 0) || 0

      setStats({
        totalAssessments,
        avgScore: Number(avgScore.toFixed(1)),
        completedModules,
        timeSpent
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const chartData = recentAssessments.map(assessment => ({
    name: assessment.assessments?.title || 'Assessment',
    score: assessment.percentage || 0
  }))

  const skillData = progress.reduce((acc, curr) => {
    const categoryName = curr.learning_modules?.skill_categories?.name || 'Other'
    const existing = acc.find(item => item.name === categoryName)
    if (existing) {
      existing.value += curr.progress_percentage
      existing.count += 1
    } else {
      acc.push({
        name: categoryName,
        value: curr.progress_percentage,
        count: 1,
        color: curr.learning_modules?.skill_categories?.color || '#3B82F6'
      })
    }
    return acc
  }, [] as any[]).map(item => ({
    ...item,
    value: Math.round(item.value / item.count)
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">Track your learning progress and assess your skills.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Modules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedModules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Time Spent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.timeSpent}m</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assessment Scores */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Assessment Scores</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No assessments completed yet</p>
                <Link to="/assessments" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Take your first assessment
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Skill Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Progress</h2>
          {skillData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={skillData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No learning progress yet</p>
                <Link to="/learning" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Start learning
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Assessments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Assessments</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentAssessments.length > 0 ? (
            recentAssessments.map((assessment) => (
              <div key={assessment.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    {assessment.assessments?.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Completed on {new Date(assessment.completed_at!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getScoreColor(assessment.percentage || 0)}`}>
                      {assessment.percentage?.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {assessment.time_taken}m
                    </p>
                  </div>
                  {(assessment.percentage || 0) >= 80 && (
                    <Award className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No assessments completed yet</p>
              <Link
                to="/assessments"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Take Assessment
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/assessments"
          className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-900">Take Assessment</h3>
              <p className="text-blue-700 text-sm">Test your skills</p>
            </div>
          </div>
        </Link>

        <Link
          to="/results"
          className="bg-green-50 border border-green-200 rounded-lg p-6 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-green-900">View Results</h3>
              <p className="text-green-700 text-sm">Check your progress</p>
            </div>
          </div>
        </Link>

        <Link
          to="/learning"
          className="bg-purple-50 border border-purple-200 rounded-lg p-6 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-purple-900">Learning Path</h3>
              <p className="text-purple-700 text-sm">Improve your skills</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
