import React, { useState, useEffect } from 'react'
import { supabase, Question, SkillCategory } from '../lib/supabase'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Plus, Upload, Search, Filter, Edit, Trash2, Download } from 'lucide-react'
import QuestionForm from '../components/QuestionForm'

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [questionsResult, categoriesResult] = await Promise.all([
        supabase.from('questions').select(`
          *,
          skill_categories (
            id,
            name,
            color
          )
        `).order('created_at', { ascending: false }),
        supabase.from('skill_categories').select('*').order('name')
      ])

      setQuestions(questionsResult.data || [])
      setCategories(categoriesResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const questionsToInsert = results.data.map((row: any) => ({
            category_id: row.category_id,
            question_text: row.question_text,
            question_type: row.question_type || 'multiple_choice',
            options: row.options ? JSON.parse(row.options) : null,
            correct_answer: row.correct_answer,
            difficulty_level: parseInt(row.difficulty_level) || 1,
            points: parseInt(row.points) || 1,
            explanation: row.explanation || null,
            tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : null
          })).filter((q: any) => q.question_text && q.correct_answer && q.category_id)

          if (questionsToInsert.length === 0) {
            alert('No valid questions found in the CSV. Please check the format and ensure required fields are present.')
            return
          }

          const { error } = await supabase
            .from('questions')
            .insert(questionsToInsert)

          if (error) throw error

          alert(`Successfully imported ${questionsToInsert.length} questions!`)
          fetchData()
        } catch (error) {
          console.error('Error importing questions:', error)
          alert('Error importing questions. Please check the CSV format and content.')
        } finally {
          setUploading(false)
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        alert('Error parsing CSV file.')
        setUploading(false)
      }
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  })

  const handleFormSubmit = async (formData: Partial<Question>) => {
    try {
      if (editingQuestion) {
        // Update
        const { error } = await supabase
          .from('questions')
          .update(formData)
          .eq('id', editingQuestion.id)
        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('questions')
          .insert(formData)
        if (error) throw error
      }
      closeForm()
      fetchData()
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Failed to save question.')
    }
  }

  const openAddForm = () => {
    setEditingQuestion(null)
    setIsFormOpen(true)
  }

  const openEditForm = (question: Question) => {
    setEditingQuestion(question)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingQuestion(null)
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Error deleting question.')
    }
  }

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || question.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const downloadTemplate = () => {
    const csvContent = `category_id,question_text,question_type,options,correct_answer,difficulty_level,points,explanation,tags
${categories[0]?.id || 'your-category-id-here'},"What is React?","multiple_choice","[""A library"", ""A framework"", ""A language"", ""A database""]","A library",1,1,"React is a JavaScript library for building user interfaces.","react,javascript,frontend"`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'questions_template.csv'
    link.click()
    window.URL.revokeObjectURL(url)
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
      <QuestionForm 
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        initialData={editingQuestion}
        categories={categories}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600 mt-1">Manage your assessment questions</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Template
          </button>
          <button
            onClick={openAddForm}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Questions (CSV)</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {uploading ? (
            <p className="text-blue-600">Uploading and processing...</p>
          ) : isDragActive ? (
            <p className="text-blue-600">Drop the CSV file here</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Drag and drop a CSV file here, or click to select</p>
              <p className="text-sm text-gray-500">Only CSV files are supported</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Questions ({filteredQuestions.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {question.skill_categories && (
                      <span 
                        className="inline-block px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: question.skill_categories.color }}
                      >
                        {question.skill_categories.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">
                      {question.question_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      Level {question.difficulty_level}
                    </span>
                    <span className="text-xs text-gray-500">
                      {question.points} pts
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {question.question_text}
                  </h3>
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="text-sm text-gray-600 mb-2">
                      Options: {(question.options as string[]).join(', ')}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <strong>Answer:</strong> {question.correct_answer}
                  </div>
                  {question.explanation && (
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {question.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditForm(question)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteQuestion(question.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredQuestions.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No questions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionBank
