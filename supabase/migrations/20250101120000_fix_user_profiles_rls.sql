/*
# [Fix] RLS Policies for user_profiles

This migration script fixes an infinite recursion error in the Row Level Security (RLS) policies for the `user_profiles` table.

## Query Description:
This operation drops the existing, potentially faulty RLS policies on the `user_profiles` table and replaces them with corrected versions. It introduces a helper function `get_current_user_role()` to safely check a user's role without causing a recursive loop. This change is critical for the application's authentication and data access to function correctly. No data will be lost or modified.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- **Tables Affected:** `user_profiles` (policy changes only)
- **Functions Created:** `get_current_user_role()`
- **Policies Dropped:** All existing policies on `user_profiles`.
- **Policies Created:** New, safe policies for SELECT, UPDATE, DELETE on `user_profiles`.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes. This change corrects a critical flaw in the RLS implementation, enhancing security and stability.
- Auth Requirements: Policies rely on `auth.uid()`.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. The helper function is lightweight and will not impact performance.
*/

-- Step 1: Drop all existing policies on user_profiles to ensure a clean slate.
-- This is safe because we will recreate them immediately.
DROP POLICY IF EXISTS "Users can view their own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete any profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Deny direct inserts on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable SELECT for users and admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable UPDATE for users and admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable DELETE for admins only" ON public.user_profiles;
DROP POLICY IF EXISTS "Deny direct INSERT" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;


-- Step 2: Create a helper function to get the current user's role.
-- This function is marked with `SECURITY DEFINER` to run with the permissions of the function owner,
-- allowing it to read the `user_profiles` table without triggering the RLS policies on it for the calling user.
-- This is the key to breaking the infinite recursion.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;


-- Step 3: Recreate the RLS policies correctly.

-- Ensure RLS is enabled on the table.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT Policies
CREATE POLICY "Users can view their own profile." ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles." ON public.user_profiles
FOR SELECT USING (public.get_current_user_role() = 'admin');

-- UPDATE Policies
CREATE POLICY "Users can update their own profile." ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile." ON public.user_profiles
FOR UPDATE USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');

-- DELETE Policies
CREATE POLICY "Admins can delete any profile." ON public.user_profiles
FOR DELETE USING (public.get_current_user_role() = 'admin');

-- INSERT Policies
CREATE POLICY "Deny direct INSERT" ON public.user_profiles
FOR INSERT WITH CHECK (false);
