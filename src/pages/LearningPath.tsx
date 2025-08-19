import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, LearningModule, UserProgress, SkillCategory } from '../lib/supabase'
import { BookOpen, Play, CheckCircle, Clock, Target, Star, ArrowRight } from 'lucide-react'

const LearningPath: React.FC = () => {
  const { user } = useAuth()
  const [modules, setModules] = useState<LearningModule[]>([])
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLearningData()
  }, [user])

  const fetchLearningData = async () => {
    if (!user) return

    try {
      const [modulesResult, progressResult, categoriesResult] = await Promise.all([
        supabase.from('learning_modules').select(`
          *,
          skill_categories (
            id,
            name,
            color
          )
        `).eq('is_published', true).order('order_index'),
        
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        
        supabase.from('skill_categories').select('*').order('name')
      ])

      setModules(modulesResult.data || [])
      setProgress(progressResult.data || [])
      setCategories(categoriesResult.data || [])
    } catch (error) {
      console.error('Error fetching learning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getModuleProgress = (moduleId: string) => {
    return progress.find(p => p.learning_module_id === moduleId)
  }

  const startModule = async (moduleId: string) => {
    try {
      const existingProgress = getModuleProgress(moduleId)
      
      if (!existingProgress) {
        await supabase.from('user_progress').insert({
          user_id: user?.id,
          learning_module_id: moduleId,
          status: 'in_progress',
          progress_percentage: 0
        })
      }
      
      // In a real app, this would navigate to the learning module content
      alert('Learning module started! (In a real app, this would open the module content)')
      fetchLearningData() // Refresh data
    } catch (error) {
      console.error('Error starting module:', error)
    }
  }

  const completeModule = async (moduleId: string) => {
    try {
      const existingProgress = getModuleProgress(moduleId)
      
      if (existingProgress) {
        await supabase
          .from('user_progress')
          .update({
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
      } else {
        await supabase.from('user_progress').insert({
          user_id: user?.id,
          learning_module_id: moduleId,
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString()
        })
      }
      
      fetchLearningData() // Refresh data
    } catch (error) {
      console.error('Error completing module:', error)
    }
  }

  const filteredModules = modules.filter(module => {
    if (!selectedCategory) return true
    return module.category_id === selectedCategory
  })

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-100 text-green-800'
    if (level <= 4) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return 'Beginner'
    if (level <= 4) return 'Intermediate'
    return 'Advanced'
  }

  const getOverallProgress = () => {
    if (modules.length === 0) return 0
    const completedModules = progress.filter(p => p.status === 'completed').length
    return Math.round((completedModules / modules.length) * 100)
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
        <h1 className="text-3xl font-bold text-gray-900">Learning Path</h1>
        <p className="text-gray-600 mt-1">Develop your skills with personalized learning modules</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
          <span className="text-2xl font-bold text-blue-600">{getOverallProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${getOverallProgress()}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {progress.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {progress.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {modules.length - progress.length}
            </div>
            <div className="text-sm text-gray-600">Not Started</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Learning Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => {
          const moduleProgress = getModuleProgress(module.id)
          const isCompleted = moduleProgress?.status === 'completed'
          const isInProgress = moduleProgress?.status === 'in_progress'
          const progressPercentage = moduleProgress?.progress_percentage || 0

          return (
            <div key={module.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {module.skill_categories && (
                    <span 
                      className="inline-block px-2 py-1 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: module.skill_categories.color }}
                    >
                      {module.skill_categories.name}
                    </span>
                  )}
                  {isCompleted && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                
                {module.description && (
                  <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                )}

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {module.estimated_time || 30} min
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty_level)}`}>
                    {getDifficultyLabel(module.difficulty_level)}
                  </span>
                </div>

                {isInProgress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-500">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  {!isCompleted && !isInProgress && (
                    <button
                      onClick={() => startModule(module.id)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Learning
                    </button>
                  )}
                  
                  {isInProgress && (
                    <>
                      <button
                        onClick={() => startModule(module.id)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => completeModule(module.id)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  
                  {isCompleted && (
                    <button
                      onClick={() => startModule(module.id)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No learning modules available</h3>
          <p className="text-gray-600">
            {selectedCategory 
              ? 'No modules found in this category.' 
              : 'Learning modules will be available soon.'}
          </p>
        </div>
      )}

      {/* Personalized Recommendations */}
      {progress.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
          <div className="space-y-4">
            {modules
              .filter(module => !getModuleProgress(module.id))
              .slice(0, 3)
              .map((module) => (
                <div key={module.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-900">{module.title}</h3>
                      <p className="text-sm text-blue-700">
                        {module.skill_categories?.name} • {getDifficultyLabel(module.difficulty_level)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startModule(module.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Start
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LearningPath
