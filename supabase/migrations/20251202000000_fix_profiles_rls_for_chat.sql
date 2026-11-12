-- Fix RLS policy on profiles table to allow students to see teacher profiles
-- This is needed for the chat feature where students need to see teacher names

-- First, let's check if there's an existing policy and create a new one that allows
-- reading basic profile info (id, full_name, avatar_url) for teachers

-- Drop existing restrictive policy if it exists (we'll recreate it properly)
DROP POLICY IF EXISTS "Users can view teacher profiles" ON profiles;
DROP POLICY IF EXISTS "Allow reading teacher profiles for chat" ON profiles;

-- Create policy to allow authenticated users to read teacher profiles
-- This allows students to see teacher names in the chat
CREATE POLICY "Allow reading teacher profiles for chat"
ON profiles
FOR SELECT
USING (
  -- Users can always read their own profile
  auth.uid() = id
  OR
  -- Users can read profiles of teachers (for chat feature)
  role = 'teacher'
  OR
  -- Teachers can read student profiles (for grading, chat, etc.)
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'teacher'
  )
);

-- Alternative: If the above doesn't work due to existing policies,
-- we can create a more permissive read policy
-- Uncomment below if needed:

-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
-- CREATE POLICY "Public profiles are viewable by everyone"
-- ON profiles FOR SELECT
-- USING (true);
