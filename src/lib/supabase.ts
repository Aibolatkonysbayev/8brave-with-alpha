import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface SkillCategory {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  category_id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: any
  correct_answer: string
  difficulty_level: number
  points: number
  explanation?: string
  tags?: string[]
  created_by?: string
  created_at: string
  updated_at: string
  skill_categories?: SkillCategory
}

export interface Assessment {
  id: string
  title: string
  description?: string
  time_limit?: number
  passing_score: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface UserAssessment {
  id: string
  user_id: string
  assessment_id: string
  status: 'in_progress' | 'completed' | 'abandoned'
  score?: number
  total_points?: number
  percentage?: number
  time_taken?: number
  started_at: string
  completed_at?: string
  created_at: string
  updated_at: string
  assessments?: Assessment
}

export interface UserAnswer {
  id: string
  user_assessment_id: string
  question_id: string
  user_answer?: string
  is_correct?: boolean
  points_earned: number
  time_spent?: number
  created_at: string
  questions?: Question
}

export interface LearningModule {
  id: string
  category_id: string
  title: string
  description?: string
  content?: string
  difficulty_level: number
  estimated_time?: number
  order_index?: number
  is_published: boolean
  created_by?: string
  created_at: string
  updated_at: string
  skill_categories?: SkillCategory
}

export interface UserProgress {
  id: string
  user_id: string
  learning_module_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  completed_at?: string
  created_at: string
  updated_at: string
  learning_modules?: LearningModule
}
