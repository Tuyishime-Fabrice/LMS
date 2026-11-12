-- =====================================================
-- Migration: Create assignment_submissions table
-- Purpose: Handle submissions for regular assignments (from course_lessons)
--          separate from capstone_submissions
-- =====================================================

-- Drop table if exists (for clean re-run)
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_links TEXT[] DEFAULT '{}',
  description TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- Create indexes
CREATE INDEX idx_assignment_submissions_lesson ON public.assignment_submissions(lesson_id);
CREATE INDEX idx_assignment_submissions_student ON public.assignment_submissions(student_id);

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Students can view their own submissions
CREATE POLICY "Students can view their own assignment submissions"
  ON public.assignment_submissions 
  FOR SELECT
  USING (auth.uid() = student_id);

-- Policy 2: Students can insert/update/delete their own submissions
CREATE POLICY "Students can manage their own assignment submissions"
  ON public.assignment_submissions 
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Policy 3: Teachers can view submissions for their courses
CREATE POLICY "Teachers can view assignment submissions for their courses"
  ON public.assignment_submissions 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.course_lessons cl
      INNER JOIN public.course_chapters ch ON cl.chapter_id = ch.id
      INNER JOIN public.courses c ON ch.course_id = c.id
      WHERE cl.id = public.assignment_submissions.lesson_id 
        AND c.teacher_id = auth.uid()
    )
  );

-- Policy 4: Teachers can update submissions for grading
CREATE POLICY "Teachers can update assignment submissions for grading"
  ON public.assignment_submissions 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.course_lessons cl
      INNER JOIN public.course_chapters ch ON cl.chapter_id = ch.id
      INNER JOIN public.courses c ON ch.course_id = c.id
      WHERE cl.id = public.assignment_submissions.lesson_id 
        AND c.teacher_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE public.assignment_submissions IS 'Submissions for regular assignments (from course_lessons with content_type=assignment)';
COMMENT ON COLUMN public.assignment_submissions.lesson_id IS 'Reference to course_lessons where content_type=assignment';
COMMENT ON COLUMN public.assignment_submissions.project_links IS 'Array of file paths in storage';
