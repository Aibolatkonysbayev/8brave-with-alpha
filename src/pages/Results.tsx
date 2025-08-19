import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, UserAssessment, UserAnswer } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Trophy, TrendingUp, Download, Eye, Award, Target } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const Results: React.FC = () => {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState<UserAssessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<UserAssessment | null>(null)
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [skillAnalysis, setSkillAnalysis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    fetchResults()
  }, [user])

  useEffect(() => {
    if (selectedAssessment) {
      fetchDetailedResults(selectedAssessment.id)
    }
  }, [selectedAssessment])

  const fetchResults = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('user_assessments')
        .select(`
          *,
          assessments (
            title,
            description,
            passing_score
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      setAssessments(data || [])
      if (data && data.length > 0) {
        setSelectedAssessment(data[0])
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedResults = async (assessmentId: string) => {
    try {
      const { data } = await supabase
        .from('user_answers')
        .select(`
          *,
          questions (
            *,
            skill_categories (
              name,
              color
            )
          )
        `)
        .eq('user_assessment_id', assessmentId)

      setAnswers(data || [])
      
      // Analyze skills
      const skillMap = new Map()
      data?.forEach(answer => {
        const category = answer.questions?.skill_categories?.name || 'Other'
        if (!skillMap.has(category)) {
          skillMap.set(category, {
            name: category,
            total: 0,
            correct: 0,
            color: answer.questions?.skill_categories?.color || '#3B82F6'
          })
        }
        const skill = skillMap.get(category)
        skill.total++
        if (answer.is_correct) skill.correct++
      })

      const skillAnalysisData = Array.from(skillMap.values()).map(skill => ({
        ...skill,
        percentage: Math.round((skill.correct / skill.total) * 100)
      }))

      setSkillAnalysis(skillAnalysisData)
    } catch (error) {
      console.error('Error fetching detailed results:', error)
    }
  }

  const generatePDFReport = async () => {
    if (!selectedAssessment) return

    setGeneratingPDF(true)
    
    try {
      const pdf = new jsPDF()
      
      // Header
      pdf.setFontSize(20)
      pdf.text('Skills Assessment Report', 20, 30)
      
      pdf.setFontSize(12)
      pdf.text(`Assessment: ${selectedAssessment.assessments?.title}`, 20, 50)
      pdf.text(`Date: ${new Date(selectedAssessment.completed_at!).toLocaleDateString()}`, 20, 60)
      pdf.text(`Score: ${selectedAssessment.percentage?.toFixed(1)}%`, 20, 70)
      pdf.text(`Time Taken: ${selectedAssessment.time_taken} minutes`, 20, 80)
      
      // Result Summary
      pdf.setFontSize(16)
      pdf.text('Result Summary', 20, 100)
      
      pdf.setFontSize(12)
      const passed = (selectedAssessment.percentage || 0) >= (selectedAssessment.assessments?.passing_score || 0)
      pdf.text(`Status: ${passed ? 'PASSED' : 'FAILED'}`, 20, 120)
      pdf.text(`Total Points: ${selectedAssessment.score}/${selectedAssessment.total_points}`, 20, 130)
      
      // Skill Analysis
      pdf.setFontSize(16)
      pdf.text('Skill Analysis', 20, 150)
      
      let yPos = 170
      skillAnalysis.forEach(skill => {
        pdf.setFontSize(12)
        pdf.text(`${skill.name}: ${skill.percentage}% (${skill.correct}/${skill.total})`, 20, yPos)
        yPos += 10
      })
      
      // Learning Recommendations
      pdf.setFontSize(16)
      pdf.text('Learning Recommendations', 20, yPos + 20)
      
      yPos += 40
      const weakSkills = skillAnalysis.filter(skill => skill.percentage < 70)
      if (weakSkills.length > 0) {
        pdf.setFontSize(12)
        pdf.text('Areas for improvement:', 20, yPos)
        yPos += 15
        
        weakSkills.forEach(skill => {
          pdf.text(`• Focus on ${skill.name} skills`, 25, yPos)
          yPos += 10
        })
      } else {
        pdf.setFontSize(12)
        pdf.text('Excellent performance across all skill areas!', 20, yPos)
      }
      
      pdf.save(`assessment-report-${selectedAssessment.id}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF report')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const getScoreColor = (score: number, passingScore: number = 70) => {
    if (score >= passingScore) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'bg-green-500' }
    if (score >= 80) return { level: 'Good', color: 'bg-blue-500' }
    if (score >= 70) return { level: 'Average', color: 'bg-yellow-500' }
    return { level: 'Needs Improvement', color: 'bg-red-500' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No assessment results yet</h3>
        <p className="text-gray-600">Complete an assessment to see your results and analysis.</p>
      </div>
    )
  }

  const chartData = assessments.slice(0, 10).reverse().map(assessment => ({
    name: assessment.assessments?.title || 'Assessment',
    score: assessment.percentage || 0,
    date: new Date(assessment.completed_at!).toLocaleDateString()
  }))

  const radarData = skillAnalysis.map(skill => ({
    skill: skill.name,
    score: skill.percentage,
    fullMark: 100
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessment Results</h1>
          <p className="text-gray-600 mt-1">Review your performance and get insights</p>
        </div>
        {selectedAssessment && (
          <button
            onClick={generatePDFReport}
            disabled={generatingPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </>
            )}
          </button>
        )}
      </div>

      {/* Assessment Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Assessment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment) => {
            const performance = getPerformanceLevel(assessment.percentage || 0)
            const passed = (assessment.percentage || 0) >= (assessment.assessments?.passing_score || 70)
            
            return (
              <button
                key={assessment.id}
                onClick={() => setSelectedAssessment(assessment)}
                className={`text-left p-4 border rounded-lg transition-colors ${
                  selectedAssessment?.id === assessment.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{assessment.assessments?.title}</h3>
                  {passed && <Award className="h-5 w-5 text-yellow-500" />}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {new Date(assessment.completed_at!).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold ${getScoreColor(assessment.percentage || 0, assessment.assessments?.passing_score || 70)}`}>
                    {assessment.percentage?.toFixed(1)}%
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full text-white ${performance.color}`}>
                    {performance.level}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedAssessment && (
        <>
          {/* Detailed Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Performance Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment History</h2>
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
              </div>

              {/* Skill Analysis Radar */}
              {skillAnalysis.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Analysis</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fontSize: 12 }}
                      />
                      <Radar 
                        name="Score" 
                        dataKey="score" 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.3} 
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Overall Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(selectedAssessment.percentage || 0, selectedAssessment.assessments?.passing_score || 70)}`}>
                        {selectedAssessment.percentage?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          (selectedAssessment.percentage || 0) >= (selectedAssessment.assessments?.passing_score || 70)
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(selectedAssessment.percentage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Points Earned</span>
                    <span className="font-medium">{selectedAssessment.score}/{selectedAssessment.total_points}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Time Taken</span>
                    <span className="font-medium">{selectedAssessment.time_taken} minutes</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Passing Score</span>
                    <span className="font-medium">{selectedAssessment.assessments?.passing_score}%</span>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedAssessment.percentage || 0) >= (selectedAssessment.assessments?.passing_score || 70)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(selectedAssessment.percentage || 0) >= (selectedAssessment.assessments?.passing_score || 70) ? (
                        <>
                          <Trophy className="h-4 w-4 mr-1" />
                          Passed
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-1" />
                          Failed
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Learning Recommendations */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Learning Recommendations</h2>
                <div className="space-y-4">
                  {skillAnalysis.length > 0 ? (
                    <>
                      {skillAnalysis
                        .filter(skill => skill.percentage < 70)
                        .slice(0, 3)
                        .map((skill, index) => (
                          <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="font-medium text-yellow-800 mb-1">Improve {skill.name}</h4>
                            <p className="text-sm text-yellow-700">
                              Score: {skill.percentage}% - Consider reviewing materials for this skill area.
                            </p>
                          </div>
                        ))}
                      
                      {skillAnalysis.every(skill => skill.percentage >= 70) && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-1">Excellent Performance!</h4>
                          <p className="text-sm text-green-700">
                            You've demonstrated strong skills across all areas. Consider taking advanced assessments.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600">Complete more detailed assessments to get personalized recommendations.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Results
