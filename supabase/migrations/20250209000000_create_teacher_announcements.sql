-- Create teacher_announcements table for course-specific announcements
CREATE TABLE IF NOT EXISTS teacher_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_teacher ON teacher_announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_course ON teacher_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_active ON teacher_announcements(is_active);

-- Enable RLS
ALTER TABLE teacher_announcements ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own announcements
CREATE POLICY "Teachers can create announcements"
  ON teacher_announcements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their announcements"
  ON teacher_announcements FOR SELECT
  TO authenticated
  USING (
    auth.uid() = teacher_id
    OR 
    -- Students can see announcements for courses they're enrolled in
    (
      is_active = true 
      AND (
        course_id IS NULL AND EXISTS (
          SELECT 1 FROM course_enrollments ce
          JOIN courses c ON ce.course_id = c.id
          WHERE ce.student_id = auth.uid() AND c.teacher_id = teacher_announcements.teacher_id
        )
        OR
        course_id IN (
          SELECT course_id FROM course_enrollments WHERE student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Teachers can update their announcements"
  ON teacher_announcements FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their announcements"
  ON teacher_announcements FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_teacher_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_announcements_updated_at
  BEFORE UPDATE ON teacher_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_announcements_updated_at();
