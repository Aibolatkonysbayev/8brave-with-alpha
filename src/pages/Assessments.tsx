import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Assessment, UserAssessment } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Users, Target, Play, CheckCircle } from 'lucide-react'

const Assessments: React.FC = () => {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [userAssessments, setUserAssessments] = useState<UserAssessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssessments()
  }, [user])

  const fetchAssessments = async () => {
    try {
      // Fetch all active assessments
      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Fetch user's assessment history
      const { data: userAssessmentsData } = await supabase
        .from('user_assessments')
        .select('*')
        .eq('user_id', user?.id)

      setAssessments(assessmentsData || [])
      setUserAssessments(userAssessmentsData || [])
    } catch (error) {
      console.error('Error fetching assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserAssessmentStatus = (assessmentId: string) => {
    const userAssessment = userAssessments.find(ua => ua.assessment_id === assessmentId)
    return userAssessment?.status || null
  }

  const getUserScore = (assessmentId: string) => {
    const userAssessment = userAssessments.find(ua => ua.assessment_id === assessmentId && ua.status === 'completed')
    return userAssessment?.percentage || null
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
        <h1 className="text-3xl font-bold text-gray-900">Available Assessments</h1>
        <p className="text-gray-600 mt-1">Test your skills and track your progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessments.map((assessment) => {
          const status = getUserAssessmentStatus(assessment.id)
          const score = getUserScore(assessment.id)
          const isCompleted = status === 'completed'
          const isInProgress = status === 'in_progress'

          return (
            <div key={assessment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{assessment.title}</h3>
                  {isCompleted && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                {assessment.description && (
                  <p className="text-gray-600 text-sm mb-4">{assessment.description}</p>
                )}

                <div className="space-y-2 mb-6">
                  {assessment.time_limit && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {assessment.time_limit} minutes
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Target className="h-4 w-4 mr-2" />
                    Passing score: {assessment.passing_score}%
                  </div>
                </div>

                {isCompleted && score !== null && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Your Score:</span>
                      <span className={`text-sm font-bold ${
                        score >= assessment.passing_score ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          score >= assessment.passing_score ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  {!isCompleted && !isInProgress && (
                    <Link
                      to={`/assessment/${assessment.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Assessment
                    </Link>
                  )}
                  
                  {isInProgress && (
                    <Link
                      to={`/assessment/${assessment.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                    >
                      Continue
                    </Link>
                  )}
                  
                  {isCompleted && (
                    <Link
                      to={`/assessment/${assessment.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Retake
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {assessments.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments available</h3>
          <p className="text-gray-600">Check back later for new assessments to test your skills.</p>
        </div>
      )}
    </div>
  )
}

export default Assessments
