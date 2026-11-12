-- Add price and requirements to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS requirements text;

-- Create course_chapters table
CREATE TABLE IF NOT EXISTS course_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create course_lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL, -- 'video', 'pdf', 'document'
  content_url text NOT NULL,
  duration integer, -- duration in minutes for videos
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_chapters
CREATE POLICY "Anyone can view chapters"
  ON course_chapters FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage chapters for their courses"
  ON course_chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_chapters.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS policies for course_lessons
CREATE POLICY "Anyone can view lessons"
  ON course_lessons FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage lessons for their chapters"
  ON course_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_chapters ch
      JOIN courses c ON c.id = ch.course_id
      WHERE ch.id = course_lessons.chapter_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_course_chapters_updated_at
  BEFORE UPDATE ON course_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at
  BEFORE UPDATE ON course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();