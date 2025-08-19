/*
# [Fix Idempotency Migration]
This script ensures the database schema is correctly set up by creating tables, policies, and other objects only if they do not already exist. It is designed to be run safely multiple times without causing errors on an existing database.

## Query Description:
This operation will check for the existence of each table before creating it. It will also drop and recreate Row Level Security (RLS) policies to ensure they are up-to-date. This script is safe to run on your existing database and will not delete any of your data. It is designed to fix the "relation already exists" error.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Affects all tables: user_profiles, skill_categories, questions, assessments, user_assessments, user_answers, learning_modules, user_progress.
- Creates tables only if they don't exist.
- Re-creates RLS policies to ensure correctness.

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Relies on Supabase Auth roles]

## Performance Impact:
- Indexes: [Added/Modified]
- Triggers: [None]
- Estimated Impact: [Low. This script primarily defines structure and should run quickly.]
*/

-- 1. Create skill_categories table
CREATE TABLE IF NOT EXISTS public.skill_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    description text,
    color character varying DEFAULT '#3B82F6'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skill_categories_pkey PRIMARY KEY (id)
);
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- 2. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email character varying NOT NULL,
    full_name character varying,
    "role" character varying DEFAULT 'user'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category_id uuid,
    question_text text NOT NULL,
    question_type character varying DEFAULT 'multiple_choice'::character varying NOT NULL,
    options jsonb,
    correct_answer text NOT NULL,
    difficulty_level integer DEFAULT 1 NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    explanation text,
    tags text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.skill_categories(id) ON DELETE SET NULL,
    CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 4. Create assessments table
CREATE TABLE IF NOT EXISTS public.assessments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title character varying NOT NULL,
    description text,
    time_limit integer,
    passing_score integer DEFAULT 70 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessments_pkey PRIMARY KEY (id),
    CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- 5. Create user_assessments table
CREATE TABLE IF NOT EXISTS public.user_assessments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    status character varying DEFAULT 'in_progress'::character varying NOT NULL,
    score integer,
    total_points integer,
    percentage double precision,
    time_taken integer,
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_assessments_pkey PRIMARY KEY (id),
    CONSTRAINT user_assessments_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE,
    CONSTRAINT user_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;

-- 6. Create user_answers table
CREATE TABLE IF NOT EXISTS public.user_answers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_assessment_id uuid NOT NULL,
    question_id uuid NOT NULL,
    user_answer text,
    is_correct boolean,
    points_earned integer DEFAULT 0 NOT NULL,
    time_spent integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_answers_pkey PRIMARY KEY (id),
    CONSTRAINT user_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE,
    CONSTRAINT user_answers_user_assessment_id_fkey FOREIGN KEY (user_assessment_id) REFERENCES public.user_assessments(id) ON DELETE CASCADE
);
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- 7. Create learning_modules table
CREATE TABLE IF NOT EXISTS public.learning_modules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL,
    title character varying NOT NULL,
    description text,
    content text,
    difficulty_level integer DEFAULT 1 NOT NULL,
    estimated_time integer,
    order_index integer,
    is_published boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT learning_modules_pkey PRIMARY KEY (id),
    CONSTRAINT learning_modules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    CONSTRAINT learning_modules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

-- 8. Create user_progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    learning_module_id uuid NOT NULL,
    status character varying DEFAULT 'not_started'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_progress_pkey PRIMARY KEY (id),
    CONSTRAINT user_progress_learning_module_id_fkey FOREIGN KEY (learning_module_id) REFERENCES public.learning_modules(id) ON DELETE CASCADE,
    CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  role text;
BEGIN
  SELECT "role" INTO role
  FROM public.user_profiles
  WHERE user_profiles.user_id = get_user_role.user_id;
  RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
-- Drop policies if they exist, then create them to ensure they are up-to-date.

-- user_profiles policies
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.user_profiles;
CREATE POLICY "Allow users to view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
CREATE POLICY "Allow users to update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.user_profiles;
CREATE POLICY "Allow admins to manage all profiles" ON public.user_profiles FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- skill_categories policies
DROP POLICY IF EXISTS "Allow all users to view categories" ON public.skill_categories;
CREATE POLICY "Allow all users to view categories" ON public.skill_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins to manage categories" ON public.skill_categories;
CREATE POLICY "Allow admins to manage categories" ON public.skill_categories FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- questions policies
DROP POLICY IF EXISTS "Allow all users to view questions" ON public.questions;
CREATE POLICY "Allow all users to view questions" ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins to manage questions" ON public.questions;
CREATE POLICY "Allow admins to manage questions" ON public.questions FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- assessments policies
DROP POLICY IF EXISTS "Allow users to view active assessments" ON public.assessments;
CREATE POLICY "Allow users to view active assessments" ON public.assessments FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Allow admins to manage assessments" ON public.assessments;
CREATE POLICY "Allow admins to manage assessments" ON public.assessments FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- user_assessments policies
DROP POLICY IF EXISTS "Allow users to manage their own assessments" ON public.user_assessments;
CREATE POLICY "Allow users to manage their own assessments" ON public.user_assessments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to view all user assessments" ON public.user_assessments;
CREATE POLICY "Allow admins to view all user assessments" ON public.user_assessments FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- user_answers policies
DROP POLICY IF EXISTS "Allow users to manage their own answers" ON public.user_answers;
CREATE POLICY "Allow users to manage their own answers" ON public.user_answers FOR ALL USING (
  auth.uid() = (
    SELECT user_id FROM public.user_assessments WHERE id = user_assessment_id
  )
);
DROP POLICY IF EXISTS "Allow admins to view all answers" ON public.user_answers;
CREATE POLICY "Allow admins to view all answers" ON public.user_answers FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- learning_modules policies
DROP POLICY IF EXISTS "Allow users to view published modules" ON public.learning_modules;
CREATE POLICY "Allow users to view published modules" ON public.learning_modules FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Allow admins to manage modules" ON public.learning_modules;
CREATE POLICY "Allow admins to manage modules" ON public.learning_modules FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- user_progress policies
DROP POLICY IF EXISTS "Allow users to manage their own progress" ON public.user_progress;
CREATE POLICY "Allow users to manage their own progress" ON public.user_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to view all progress" ON public.user_progress;
CREATE POLICY "Allow admins to view all progress" ON public.user_progress FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
