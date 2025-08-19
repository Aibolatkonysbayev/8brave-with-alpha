import React, { useState, useEffect } from 'react'
import { Question, SkillCategory, supabase } from '../lib/supabase'
import { X } from 'lucide-react'

interface QuestionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (question: Partial<Question>) => Promise<void>
  initialData?: Question | null
  categories: SkillCategory[]
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
}) => {
  const [formData, setFormData] = useState<Partial<Question>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        options: initialData.options || [],
        tags: initialData.tags || [],
      })
    } else {
      setFormData({
        question_type: 'multiple_choice',
        difficulty_level: 1,
        points: 1,
        options: ['', '', '', ''],
        tags: [],
      })
    }
  }, [initialData, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])]
    newOptions[index] = value
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim())
    setFormData(prev => ({ ...prev, tags }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit(formData)
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Question' : 'Add New Question'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Question Text</label>
              <textarea
                name="question_text"
                value={formData.question_text || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Question Type</label>
                <select
                  name="question_type"
                  value={formData.question_type || ''}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
            </div>

            {formData.question_type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Options</label>
                <div className="space-y-2 mt-1">
                  {(formData.options as string[] || []).map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
              <input
                type="text"
                name="correct_answer"
                value={formData.correct_answer || ''}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty Level (1-5)</label>
                <input
                  type="number"
                  name="difficulty_level"
                  value={formData.difficulty_level || 1}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <input
                  type="number"
                  name="points"
                  value={formData.points || 1}
                  onChange={handleChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Explanation (Optional)</label>
              <textarea
                name="explanation"
                value={formData.explanation || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={(formData.tags as string[] || []).join(', ')}
                onChange={handleTagChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuestionForm
