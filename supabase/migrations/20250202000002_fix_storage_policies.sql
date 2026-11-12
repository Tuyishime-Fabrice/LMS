-- =====================================================
-- Migration: Fix storage bucket policies for assignment uploads
-- Purpose: Allow students to upload assignment files to lesson-files bucket
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can upload assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their uploaded assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view all lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view lesson files" ON storage.objects;

-- Policy 1: Allow students to upload files to their own submission folders
CREATE POLICY "Students can upload assignment files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-files' 
  AND (storage.foldername(name))[1] = 'capstone-submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

-- Policy 2: Allow students to view their own uploaded files
CREATE POLICY "Students can view their uploaded assignment files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-files'
  AND (
    -- Students can see their own submissions
    (storage.foldername(name))[1] = 'capstone-submissions'
    AND auth.uid()::text = (storage.foldername(name))[3]
  )
);

-- Policy 3: Allow teachers to view all files in lesson-files bucket
CREATE POLICY "Teachers can view all lesson files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

-- Policy 4: Allow public read access to lesson content (not submissions)
CREATE POLICY "Public can view lesson content files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'lesson-files'
  AND (storage.foldername(name))[1] != 'capstone-submissions'
);

-- Add comments
COMMENT ON POLICY "Students can upload assignment files" ON storage.objects IS 'Allows students to upload files to their submission folders';
COMMENT ON POLICY "Teachers can view all lesson files" ON storage.objects IS 'Allows teachers to view all files including student submissions';
