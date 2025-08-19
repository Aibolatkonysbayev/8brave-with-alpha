/*
# Skills Assessment Platform Database Schema
Complete database structure for skills assessment platform with admin question management, user assessments, results analysis, and learning paths.

## Query Description: This operation creates the foundational database structure for a skills assessment platform. It includes tables for managing questions, assessments, user results, and learning paths. The schema supports role-based access with RLS policies for data security. No existing data will be affected as this is a new schema creation.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- auth.users (Supabase built-in authentication)
- user_profiles (Extended user information with roles)
- skill_categories (Categories for organizing skills)
- questions (Question bank with metadata)
- assessments (Assessment templates)
- assessment_questions (Many-to-many relationship)
- user_assessments (User test sessions)
- user_answers (Individual question responses)
- learning_modules (Educational content)
- user_progress (Learning progress tracking)

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes
- Auth Requirements: All tables require authentication

## Performance Impact:
- Indexes: Added on foreign keys and frequently queried columns
- Triggers: Added for updated_at timestamps
- Estimated Impact: Minimal performance impact for new schema
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles with roles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Skill categories for organization
CREATE TABLE skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions bank
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES skill_categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB, -- For multiple choice options
    correct_answer TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    points INTEGER NOT NULL DEFAULT 1,
    explanation TEXT,
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment templates
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    time_limit INTEGER, -- in minutes
    passing_score INTEGER DEFAULT 70,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment questions relationship
CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, question_id),
    UNIQUE(assessment_id, order_index)
);

-- User assessment sessions
CREATE TABLE user_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    score INTEGER,
    total_points INTEGER,
    percentage DECIMAL(5,2),
    time_taken INTEGER, -- in minutes
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User answers for each question
CREATE TABLE user_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_assessment_id UUID REFERENCES user_assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_spent INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_assessment_id, question_id)
);

-- Learning modules for skill development
CREATE TABLE learning_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES skill_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Rich text content
    difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_time INTEGER, -- in minutes
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, learning_module_id)
);

-- Create indexes for better performance
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_user_assessments_user ON user_assessments(user_id);
CREATE INDEX idx_user_assessments_status ON user_assessments(status);
CREATE INDEX idx_user_answers_assessment ON user_answers(user_assessment_id);
CREATE INDEX idx_learning_modules_category ON learning_modules(category_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skill_categories_updated_at BEFORE UPDATE ON skill_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_assessments_updated_at BEFORE UPDATE ON user_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON learning_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: Users can view/update own profile, admins can view all
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Skill categories: Read access for all authenticated users, write access for admins
CREATE POLICY "Anyone can view skill categories" ON skill_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage skill categories" ON skill_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Questions: Read access for all authenticated users, write access for admins
CREATE POLICY "Anyone can view questions" ON questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage questions" ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Assessments: Read access for all authenticated users, write access for admins
CREATE POLICY "Anyone can view active assessments" ON assessments FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
CREATE POLICY "Admins can view all assessments" ON assessments FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage assessments" ON assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Assessment questions: Read access for all authenticated users, write access for admins
CREATE POLICY "Anyone can view assessment questions" ON assessment_questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage assessment questions" ON assessment_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User assessments: Users can view/manage own assessments, admins can view all
CREATE POLICY "Users can view own assessments" ON user_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own assessments" ON user_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessments" ON user_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all assessments" ON user_assessments FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User answers: Users can view/manage own answers, admins can view all
CREATE POLICY "Users can view own answers" ON user_answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_assessments WHERE id = user_assessment_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own answers" ON user_answers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_assessments WHERE id = user_assessment_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own answers" ON user_answers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_assessments WHERE id = user_assessment_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all answers" ON user_answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Learning modules: Read access for all authenticated users, write access for admins
CREATE POLICY "Anyone can view published modules" ON learning_modules FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);
CREATE POLICY "Admins can view all modules" ON learning_modules FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage modules" ON learning_modules FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User progress: Users can view/manage own progress, admins can view all
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON user_progress FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert sample skill categories
INSERT INTO skill_categories (name, description, color) VALUES
    ('Programming', 'Software development and coding skills', '#10B981'),
    ('Data Science', 'Data analysis and machine learning', '#3B82F6'),
    ('DevOps', 'Development operations and infrastructure', '#F59E0B'),
    ('Design', 'UI/UX and visual design skills', '#EC4899'),
    ('Project Management', 'Leadership and project coordination', '#8B5CF6');
