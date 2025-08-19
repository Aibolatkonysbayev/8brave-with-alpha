/*
# Skills Assessment Platform Database Schema
Creates a comprehensive database schema for a skills assessment platform with
admin question management, user assessments, learning modules, and progress tracking.

## Query Description:
This migration sets up the complete database structure for a skills assessment platform.
It includes tables for user profiles, skill categories, questions, assessments, user progress,
and learning modules. The schema supports role-based access control, CSV question imports,
assessment scoring, PDF report generation, and personalized learning paths.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- user_profiles: User account management with role-based access
- skill_categories: Categorization system for skills and questions
- questions: Question bank with metadata and scoring
- assessments: Assessment configuration and management
- user_assessments: User assessment sessions and results
- user_answers: Individual question responses and scoring
- learning_modules: Educational content and modules
- user_progress: Learning progress tracking

## Security Implications:
- RLS Status: Enabled on all tables
- Policy Changes: Yes - Comprehensive RLS policies for data security
- Auth Requirements: Supabase Auth integration required

## Performance Impact:
- Indexes: Added on foreign keys and frequently queried columns
- Triggers: None in this migration
- Estimated Impact: Minimal performance impact for new database
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Skill categories table
CREATE TABLE skill_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB, -- For multiple choice questions
    correct_answer TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    points INTEGER DEFAULT 1 CHECK (points > 0),
    explanation TEXT,
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments table
CREATE TABLE assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    time_limit INTEGER, -- in minutes
    passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User assessments table (assessment sessions)
CREATE TABLE user_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    score INTEGER,
    total_points INTEGER,
    percentage NUMERIC(5,2),
    time_taken INTEGER, -- in minutes
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User answers table
CREATE TABLE user_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_assessment_id UUID REFERENCES user_assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_spent INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_assessment_id, question_id)
);

-- Learning modules table
CREATE TABLE learning_modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Rich text content
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_time INTEGER, -- in minutes
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_module_id UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, learning_module_id)
);

-- Indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_questions_category_id ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_user_assessments_user_id ON user_assessments(user_id);
CREATE INDEX idx_user_assessments_status ON user_assessments(status);
CREATE INDEX idx_user_answers_assessment_id ON user_answers(user_assessment_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_learning_modules_category_id ON learning_modules(category_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Skill categories policies (read-only for users, full access for admins)
CREATE POLICY "Everyone can view skill categories" ON skill_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage skill categories" ON skill_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Questions policies
CREATE POLICY "Everyone can view published questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Assessments policies
CREATE POLICY "Everyone can view active assessments" ON assessments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage assessments" ON assessments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- User assessments policies
CREATE POLICY "Users can view own assessments" ON user_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments" ON user_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments" ON user_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all assessments" ON user_assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- User answers policies
CREATE POLICY "Users can view own answers" ON user_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_assessments 
            WHERE id = user_answers.user_assessment_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own answers" ON user_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_assessments 
            WHERE id = user_answers.user_assessment_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all answers" ON user_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Learning modules policies
CREATE POLICY "Everyone can view published modules" ON learning_modules
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage learning modules" ON learning_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- User progress policies
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON user_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default skill categories
INSERT INTO skill_categories (name, description, color) VALUES
    ('Frontend Development', 'HTML, CSS, JavaScript, React, Vue, Angular', '#3B82F6'),
    ('Backend Development', 'Node.js, Python, Java, PHP, Databases', '#10B981'),
    ('Data Science', 'Python, R, Machine Learning, Statistics', '#8B5CF6'),
    ('DevOps', 'Docker, Kubernetes, CI/CD, Cloud Platforms', '#F59E0B'),
    ('Mobile Development', 'React Native, Flutter, iOS, Android', '#EF4444'),
    ('UI/UX Design', 'Design Principles, Prototyping, User Research', '#EC4899');

-- Insert sample learning modules
INSERT INTO learning_modules (category_id, title, description, difficulty_level, estimated_time, order_index, is_published, content) 
SELECT 
    sc.id,
    module_data.title,
    module_data.description,
    module_data.difficulty_level,
    module_data.estimated_time,
    module_data.order_index,
    true,
    module_data.content
FROM skill_categories sc,
LATERAL (
    VALUES 
    ('Introduction to React', 'Learn the basics of React components and state management', 1, 45, 1, 'This module covers React fundamentals including components, props, and state.'),
    ('Advanced React Patterns', 'Master advanced React patterns and performance optimization', 4, 90, 2, 'Deep dive into React patterns, hooks, and performance optimization techniques.'),
    ('Database Design Fundamentals', 'Learn relational database design principles', 2, 60, 1, 'Understanding database normalization, relationships, and design patterns.'),
    ('API Development with Node.js', 'Build RESTful APIs using Node.js and Express', 3, 75, 2, 'Creating robust APIs with authentication, validation, and error handling.'),
    ('Machine Learning Basics', 'Introduction to machine learning concepts and algorithms', 2, 120, 1, 'Fundamental ML concepts, supervised and unsupervised learning.'),
    ('Data Visualization', 'Create compelling data visualizations', 3, 60, 2, 'Using tools and libraries to create effective data visualizations.'),
    ('Docker Fundamentals', 'Containerization with Docker', 2, 90, 1, 'Learn Docker basics, containers, images, and orchestration.'),
    ('Kubernetes Essentials', 'Container orchestration with Kubernetes', 4, 150, 2, 'Deploy and manage containerized applications with Kubernetes.'),
    ('Mobile App Development', 'Build cross-platform mobile applications', 3, 120, 1, 'Introduction to mobile development concepts and frameworks.'),
    ('React Native Basics', 'Native mobile development with React Native', 3, 90, 2, 'Building mobile apps using React Native framework.'),
    ('Design Thinking', 'User-centered design methodology', 1, 60, 1, 'Learn design thinking process and user-centered design principles.'),
    ('Prototyping Tools', 'Master modern prototyping tools and techniques', 2, 75, 2, 'Hands-on experience with prototyping tools and workflows.')
) AS module_data(title, description, difficulty_level, estimated_time, order_index, content)
WHERE 
    (sc.name = 'Frontend Development' AND module_data.title LIKE '%React%') OR
    (sc.name = 'Backend Development' AND (module_data.title LIKE '%Database%' OR module_data.title LIKE '%API%' OR module_data.title LIKE '%Node%')) OR
    (sc.name = 'Data Science' AND (module_data.title LIKE '%Machine Learning%' OR module_data.title LIKE '%Data%')) OR
    (sc.name = 'DevOps' AND (module_data.title LIKE '%Docker%' OR module_data.title LIKE '%Kubernetes%')) OR
    (sc.name = 'Mobile Development' AND module_data.title LIKE '%Mobile%') OR
    (sc.name = 'UI/UX Design' AND (module_data.title LIKE '%Design%' OR module_data.title LIKE '%Prototyping%'));

-- Insert sample assessments
INSERT INTO assessments (title, description, time_limit, passing_score, is_active) VALUES
    ('Frontend Developer Assessment', 'Comprehensive test covering HTML, CSS, JavaScript, and React', 60, 75, true),
    ('Backend Developer Assessment', 'Evaluate backend development skills including databases and APIs', 90, 70, true),
    ('Full Stack Developer Assessment', 'Complete evaluation of both frontend and backend skills', 120, 80, true),
    ('Data Science Fundamentals', 'Test your knowledge of data science concepts and tools', 75, 70, true),
    ('DevOps Skills Assessment', 'Evaluate DevOps practices and tools knowledge', 60, 75, true);

-- Insert sample questions
INSERT INTO questions (category_id, question_text, question_type, options, correct_answer, difficulty_level, points, explanation, tags)
SELECT 
    sc.id,
    q.question_text,
    q.question_type,
    q.options::jsonb,
    q.correct_answer,
    q.difficulty_level,
    q.points,
    q.explanation,
    q.tags
FROM skill_categories sc,
LATERAL (
    VALUES 
    ('What is the virtual DOM in React?', 'multiple_choice', '["A copy of the real DOM in memory", "A template engine", "A CSS framework", "A database"]', 'A copy of the real DOM in memory', 2, 1, 'The virtual DOM is React''s representation of the UI in memory that gets synced with the real DOM.', ARRAY['react', 'virtual-dom']),
    ('Which hook is used for side effects in React?', 'multiple_choice', '["useState", "useEffect", "useContext", "useReducer"]', 'useEffect', 2, 1, 'useEffect is the hook used for side effects like API calls, subscriptions, and DOM manipulation.', ARRAY['react', 'hooks']),
    ('What does JSX stand for?', 'multiple_choice', '["JavaScript XML", "Java Syntax Extension", "JavaScript Extension", "JSON XML"]', 'JavaScript XML', 1, 1, 'JSX stands for JavaScript XML and allows you to write HTML-like syntax in JavaScript.', ARRAY['react', 'jsx']),
    
    ('What is SQL?', 'multiple_choice', '["Structured Query Language", "Simple Query Language", "Standard Query Language", "Structured Question Language"]', 'Structured Query Language', 1, 1, 'SQL stands for Structured Query Language, used for managing relational databases.', ARRAY['sql', 'database']),
    ('Which SQL command is used to retrieve data?', 'multiple_choice', '["SELECT", "GET", "FETCH", "RETRIEVE"]', 'SELECT', 1, 1, 'SELECT is the SQL command used to retrieve data from database tables.', ARRAY['sql', 'queries']),
    ('What is a primary key?', 'multiple_choice', '["A unique identifier for each row", "The first column in a table", "A foreign key reference", "An index"]', 'A unique identifier for each row', 2, 1, 'A primary key uniquely identifies each row in a database table.', ARRAY['database', 'keys']),
    
    ('What is machine learning?', 'multiple_choice', '["A type of AI that learns from data", "A programming language", "A database system", "A web framework"]', 'A type of AI that learns from data', 1, 1, 'Machine learning is a subset of AI that enables systems to learn from data without explicit programming.', ARRAY['ml', 'ai']),
    ('What is supervised learning?', 'multiple_choice', '["Learning with labeled data", "Learning without data", "Learning with unlabeled data", "Learning with minimal data"]', 'Learning with labeled data', 2, 1, 'Supervised learning uses labeled training data to learn a mapping function.', ARRAY['ml', 'supervised']),
    
    ('What is Docker?', 'multiple_choice', '["A containerization platform", "A programming language", "A database", "A web server"]', 'A containerization platform', 2, 1, 'Docker is a platform that packages applications into lightweight, portable containers.', ARRAY['docker', 'containers']),
    ('What is the purpose of a Dockerfile?', 'multiple_choice', '["To define how to build a Docker image", "To run Docker containers", "To manage Docker networks", "To store Docker volumes"]', 'To define how to build a Docker image', 2, 1, 'A Dockerfile contains instructions for building a Docker image.', ARRAY['docker', 'dockerfile']),
    
    ('React Native is used for?', 'multiple_choice', '["Cross-platform mobile development", "Web development only", "Desktop applications", "Server-side development"]', 'Cross-platform mobile development', 2, 1, 'React Native allows building mobile apps for both iOS and Android using React.', ARRAY['react-native', 'mobile']),
    
    ('What is user-centered design?', 'multiple_choice', '["Designing with the user''s needs in focus", "Designing for developers", "Designing for business goals only", "Designing without user input"]', 'Designing with the user''s needs in focus', 1, 1, 'User-centered design puts the user''s needs, wants, and limitations at the center of the design process.', ARRAY['ux', 'design'])
) AS q(question_text, question_type, options, correct_answer, difficulty_level, points, explanation, tags)
WHERE 
    (sc.name = 'Frontend Development' AND (q.question_text LIKE '%React%' OR q.question_text LIKE '%JSX%')) OR
    (sc.name = 'Backend Development' AND (q.question_text LIKE '%SQL%' OR q.question_text LIKE '%primary key%')) OR
    (sc.name = 'Data Science' AND q.question_text LIKE '%machine learning%') OR
    (sc.name = 'DevOps' AND q.question_text LIKE '%Docker%') OR
    (sc.name = 'Mobile Development' AND q.question_text LIKE '%React Native%') OR
    (sc.name = 'UI/UX Design' AND q.question_text LIKE '%design%');
