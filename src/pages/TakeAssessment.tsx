import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Assessment, Question, UserAssessment, UserAnswer } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle } from 'lucide-react'

const TakeAssessment: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [userAssessment, setUserAssessment] = useState<UserAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(Date.now())

  const submitAssessment = useCallback(async () => {
    if (!userAssessment || submitting) return
    
    setSubmitting(true)
    
    try {
      // Calculate total points and score
      let totalPoints = 0
      let earnedPoints = 0
      
      const userAnswers: Omit<UserAnswer, 'id' | 'created_at'>[] = []
      
      for (const question of questions) {
        totalPoints += question.points
        const userAnswer = answers[question.id] || ''
        const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
        const pointsEarned = isCorrect ? question.points : 0
        earnedPoints += pointsEarned
        
        userAnswers.push({
          user_assessment_id: userAssessment.id,
          question_id: question.id,
          user_answer: userAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          time_spent: 0 // Could be implemented with more detailed tracking
        })
      }
      
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
      const timeTaken = Math.floor((Date.now() - startTime) / 1000 / 60) // minutes
      
      // Update user assessment
      await supabase
        .from('user_assessments')
        .update({
          status: 'completed',
          score: earnedPoints,
          total_points: totalPoints,
          percentage,
          time_taken: timeTaken,
          completed_at: new Date().toISOString()
        })
        .eq('id', userAssessment.id)
      
      // Insert user answers
      await supabase
        .from('user_answers')
        .insert(userAnswers)
      
      navigate('/results')
    } catch (error) {
      console.error('Error submitting assessment:', error)
      alert('Error submitting assessment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [userAssessment, questions, answers, startTime, navigate, submitting])

  useEffect(() => {
    if (timeRemaining === 0) {
      submitAssessment()
    }
  }, [timeRemaining, submitAssessment])

  useEffect(() => {
    fetchAssessmentData()
  }, [id, user])

  useEffect(() => {
    if (assessment?.time_limit && timeRemaining === null) {
      setTimeRemaining(assessment.time_limit * 60) // Convert to seconds
    }
  }, [assessment, timeRemaining])

  useEffect(() => {
    if (timeRemaining === null) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const fetchAssessmentData = async () => {
    if (!id || !user) return

    try {
      // Fetch assessment details
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single()

      if (!assessmentData) {
        navigate('/assessments')
        return
      }

      setAssessment(assessmentData)

      // Check if user has already started this assessment
      let { data: existingAssessment } = await supabase
        .from('user_assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('assessment_id', id)
        .eq('status', 'in_progress')
        .single()

      // If no in-progress assessment, create a new one
      if (!existingAssessment) {
        const { data: newAssessment } = await supabase
          .from('user_assessments')
          .insert({
            user_id: user.id,
            assessment_id: id,
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .select()
          .single()

        existingAssessment = newAssessment
      }

      setUserAssessment(existingAssessment)

      // Fetch questions for this assessment (for now, fetch random questions)
      // In a real implementation, you'd have assessment_questions table
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          *,
          skill_categories (
            name,
            color
          )
        `)
        .limit(10) // Limit to 10 questions for demo

      setQuestions(questionsData || [])

    } catch (error) {
      console.error('Error fetching assessment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex]
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment not found</h3>
        <p className="text-gray-600">The assessment you're looking for doesn't exist or has no questions.</p>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion.id] || ''
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{assessment.title}</h1>
              <p className="text-blue-100 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center bg-blue-700 rounded-lg px-4 py-2">
                <Clock className="h-5 w-5 mr-2" />
                <span className="text-lg font-bold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 bg-blue-700 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              {currentQuestion.skill_categories && (
                <span 
                  className="inline-block px-3 py-1 text-sm font-medium rounded-full text-white mr-3"
                  style={{ backgroundColor: currentQuestion.skill_categories.color }}
                >
                  {currentQuestion.skill_categories.name}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {currentQuestion.points} points • Level {currentQuestion.difficulty_level}
              </span>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentQuestion.question_text}
            </h2>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
                currentQuestion.options.map((option: string, index: number) => (
                  <label
                    key={index}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      currentAnswer === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={(e) => handleAnswer(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))
              ) : currentQuestion.question_type === 'true_false' ? (
                ['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      currentAnswer === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={(e) => handleAnswer(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))
              ) : (
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  rows={4}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`w-8 h-8 text-sm rounded-full border ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white border-blue-600'
                      : answers[questions[index].id]
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {isLastQuestion ? (
              <button
                onClick={submitAssessment}
                disabled={submitting}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Assessment
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question Navigation Sidebar */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Question Progress</h3>
        <div className="grid grid-cols-10 gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={`w-8 h-8 text-xs rounded border ${
                index === currentQuestionIndex
                  ? 'bg-blue-600 text-white border-blue-600'
                  : answers[questions[index].id]
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
            Answered
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
            Current
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-white border border-gray-300 rounded mr-2"></div>
            Unanswered
          </div>
        </div>
      </div>
    </div>
  )
}

export default TakeAssessment
