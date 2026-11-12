-- Create storage bucket for course thumbnail images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view course thumbnails
CREATE POLICY "Anyone can view course thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

-- Only teachers & admins can upload course thumbnails
CREATE POLICY "Teachers and admins can upload course thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-thumbnails'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Only teachers & admins can update course thumbnails
CREATE POLICY "Teachers and admins can update course thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'course-thumbnails'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Only teachers & admins can delete course thumbnails
CREATE POLICY "Teachers and admins can delete course thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-thumbnails'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );
