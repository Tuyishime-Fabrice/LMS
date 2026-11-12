-- Safe cohorts setup - handles existing tables and constraints
-- Run this if you get "constraint already exists" errors

-- Create cohorts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  course_id UUID,
  teacher_id UUID NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  max_students INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cohort_join_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cohort_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cohort_id, student_id)
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_join_requests ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe approach)
DROP POLICY IF EXISTS "Anyone can view active cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Teachers can view all their cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Anyone can view active cohorts for joining" ON public.cohorts;
DROP POLICY IF EXISTS "Teachers can create cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Teachers can update their own cohorts" ON public.cohorts;
DROP POLICY IF EXISTS "Teachers can delete their own cohorts" ON public.cohorts;

-- Cohorts SELECT policy - allows students to see active cohorts and teachers to see all their cohorts
CREATE POLICY "View cohorts policy"
  ON public.cohorts FOR SELECT
  USING (
    is_active = true OR auth.uid() = teacher_id
  );

CREATE POLICY "Teachers can create cohorts"
  ON public.cohorts FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their own cohorts"
  ON public.cohorts FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own cohorts"
  ON public.cohorts FOR DELETE
  USING (auth.uid() = teacher_id);

-- Drop and recreate join request policies
DROP POLICY IF EXISTS "Students can view their own join requests" ON public.cohort_join_requests;
DROP POLICY IF EXISTS "Teachers can view join requests for their cohorts" ON public.cohort_join_requests;
DROP POLICY IF EXISTS "Students can create join requests" ON public.cohort_join_requests;
DROP POLICY IF EXISTS "Students can update their own pending requests" ON public.cohort_join_requests;
DROP POLICY IF EXISTS "Teachers can update join requests for their cohorts" ON public.cohort_join_requests;

CREATE POLICY "Students can view their own join requests"
  ON public.cohort_join_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view join requests for their cohorts"
  ON public.cohort_join_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.cohorts WHERE id = cohort_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Students can create join requests"
  ON public.cohort_join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
  );

CREATE POLICY "Students can update their own pending requests"
  ON public.cohort_join_requests FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Teachers can update join requests for their cohorts"
  ON public.cohort_join_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.cohorts WHERE id = cohort_id AND teacher_id = auth.uid())
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_cohorts_teacher_id ON public.cohorts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_course_id ON public.cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_is_active ON public.cohorts(is_active);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_cohort_id ON public.cohort_join_requests(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_student_id ON public.cohort_join_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_status ON public.cohort_join_requests(status);
