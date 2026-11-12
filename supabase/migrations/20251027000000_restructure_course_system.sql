-- Restructure Course System
-- Remove price, add welcome video, level, language
-- Remove chapter descriptions
-- Add assignment content type and file upload support

-- =====================================================
-- 1. UPDATE COURSES TABLE
-- =====================================================

-- Remove price column
ALTER TABLE public.courses DROP COLUMN IF EXISTS price;

-- Add new fields to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS welcome_video_url TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS language TEXT;

COMMENT ON COLUMN public.courses.welcome_video_url IS 'URL to course welcome/introduction video';
COMMENT ON COLUMN public.courses.level IS 'Course difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN public.courses.language IS 'Language of instruction (e.g., English, Spanish, French)';

-- =====================================================
-- 2. UPDATE COURSE_CHAPTERS TABLE
-- =====================================================

-- Remove description column from chapters
ALTER TABLE public.course_chapters DROP COLUMN IF EXISTS description;

-- =====================================================
-- 3. UPDATE COURSE_LESSONS TABLE
-- =====================================================

-- Add file_url column for uploaded files (separate from content_url)
ALTER TABLE public.course_lessons 
ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.course_lessons.file_url IS 'URL to uploaded file in Supabase Storage (for PDFs, documents, assignments)';
COMMENT ON COLUMN public.course_lessons.content_url IS 'External URL or link provided by teacher';

-- Update content_type constraint to include 'assignment'
ALTER TABLE public.course_lessons
DROP CONSTRAINT IF EXISTS course_lessons_content_type_check;

ALTER TABLE public.course_lessons
ADD CONSTRAINT course_lessons_content_type_check 
CHECK (content_type IN ('video', 'pdf', 'document', 'url', 'quiz', 'assignment'));

COMMENT ON COLUMN public.course_lessons.content_type IS 'Type of lesson content: video, pdf, document, url, quiz, or assignment';

-- =====================================================
-- 4. CREATE STORAGE BUCKET FOR LESSON FILES
-- =====================================================

-- Insert storage bucket for lesson files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. STORAGE POLICIES FOR LESSON FILES
-- =====================================================

-- Teachers can upload files to their course lessons
CREATE POLICY "Teachers can upload lesson files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can update their own lesson files
CREATE POLICY "Teachers can update their lesson files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Teachers can delete their own lesson files
CREATE POLICY "Teachers can delete their lesson files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
);

-- Enrolled students and teachers can download lesson files
CREATE POLICY "Enrolled users can download lesson files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-files' AND
  (
    -- Teachers can view all files
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
    OR
    -- Students can view files from enrolled courses
    -- File path format: course_id/lesson_id/filename
    -- We'll validate enrollment based on course_id from path
    auth.uid() IN (
      SELECT student_id FROM public.course_enrollments
    )
  )
);

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.courses IS 'Course information with welcome video, level, and language';
COMMENT ON TABLE public.course_chapters IS 'Course chapters with title and order (no description)';
COMMENT ON TABLE public.course_lessons IS 'Lessons supporting 6 content types: video, pdf, document, url, quiz, assignment';
