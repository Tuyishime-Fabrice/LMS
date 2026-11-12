-- Extend Course Structure with Quiz, Progress Tracking, and Capstone Features
-- This extends the existing course_chapters and course_lessons tables

-- =====================================================
-- 1. UPDATE EXISTING TABLES
-- =====================================================

-- Add is_mandatory field to course_lessons
ALTER TABLE public.course_lessons
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;

-- Update content_type check constraint to include 'url' and 'quiz'
ALTER TABLE public.course_lessons
DROP CONSTRAINT IF EXISTS course_lessons_content_type_check;

ALTER TABLE public.course_lessons
ADD CONSTRAINT course_lessons_content_type_check 
CHECK (content_type IN ('video', 'pdf', 'document', 'url', 'quiz'));

COMMENT ON COLUMN public.course_lessons.is_mandatory IS 'If true (for quiz), students must pass before proceeding to next lesson/chapter';

-- =====================================================
-- 2. CREATE QUIZ QUESTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- [{"id": "a", "text": "Option A"}, {"id": "b", "text": "Option B"}, ...]
  correct_answer TEXT NOT NULL, -- "a", "b", "c", or "d"
  explanation TEXT, -- Optional explanation for the answer
  order_index INTEGER NOT NULL DEFAULT 0,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_id ON public.lesson_quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON public.lesson_quiz_questions(lesson_id, order_index);

ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS for quiz questions
CREATE POLICY "Anyone can view quiz questions"
  ON public.lesson_quiz_questions FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage quiz questions for their lessons"
  ON public.lesson_quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_chapters ch ON cl.chapter_id = ch.id
      JOIN public.courses c ON ch.course_id = c.id
      WHERE cl.id = lesson_id AND c.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- 3. CREATE STUDENT PROGRESS TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_position INTEGER DEFAULT 0, -- For video position tracking
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_student_id ON public.student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON public.student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON public.student_lesson_progress(student_id, is_completed);

ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS for progress
CREATE POLICY "Students can view their own progress"
  ON public.student_lesson_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view progress for their course students"
  ON public.student_lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_chapters ch ON cl.chapter_id = ch.id
      JOIN public.courses c ON ch.course_id = c.id
      WHERE cl.id = lesson_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own progress"
  ON public.student_lesson_progress FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- =====================================================
-- 4. CREATE STUDENT QUIZ ATTEMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.student_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- {"question_id": "selected_answer_id", ...}
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.student_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON public.student_quiz_attempts(lesson_id);

ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS for quiz attempts
CREATE POLICY "Students can view their own quiz attempts"
  ON public.student_quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view quiz attempts for their courses"
  ON public.student_quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_chapters ch ON cl.chapter_id = ch.id
      JOIN public.courses c ON ch.course_id = c.id
      WHERE cl.id = lesson_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own quiz attempts"
  ON public.student_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- =====================================================
-- 5. CREATE CAPSTONE PROJECTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.capstone_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  requirements TEXT[], -- Array of requirements
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id) -- One capstone per course
);

CREATE INDEX IF NOT EXISTS idx_capstone_course_id ON public.capstone_projects(course_id);

ALTER TABLE public.capstone_projects ENABLE ROW LEVEL SECURITY;

-- RLS for capstone projects
CREATE POLICY "Anyone can view capstone projects"
  ON public.capstone_projects FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage capstone projects for their courses"
  ON public.capstone_projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- =====================================================
-- 6. CREATE CAPSTONE SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.capstone_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capstone_project_id UUID NOT NULL REFERENCES public.capstone_projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_links TEXT[], -- Array of project links
  description TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade INTEGER, -- Grade out of 100
  feedback TEXT, -- Teacher feedback
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id),
  UNIQUE(capstone_project_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_capstone_submissions_project ON public.capstone_submissions(capstone_project_id);
CREATE INDEX IF NOT EXISTS idx_capstone_submissions_student ON public.capstone_submissions(student_id);

ALTER TABLE public.capstone_submissions ENABLE ROW LEVEL SECURITY;

-- RLS for capstone submissions
CREATE POLICY "Students can view their own submissions"
  ON public.capstone_submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their courses"
  ON public.capstone_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.capstone_projects cp
      JOIN public.courses c ON cp.course_id = c.id
      WHERE cp.id = capstone_project_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own submissions"
  ON public.capstone_submissions FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can update submissions for grading"
  ON public.capstone_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.capstone_projects cp
      JOIN public.courses c ON cp.course_id = c.id
      WHERE cp.id = capstone_project_id AND c.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS FOR PROGRESS CALCULATION
-- =====================================================

-- Calculate course progress for a student
CREATE OR REPLACE FUNCTION public.calculate_course_progress(p_student_id UUID, p_course_id UUID)
RETURNS TABLE (
  total_lessons INTEGER,
  completed_lessons INTEGER,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cl.id)::INTEGER as total_lessons,
    COUNT(CASE WHEN slp.is_completed = true THEN 1 END)::INTEGER as completed_lessons,
    CASE 
      WHEN COUNT(cl.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN slp.is_completed = true THEN 1 END)::NUMERIC / COUNT(cl.id)::NUMERIC) * 100, 2)
      ELSE 0
    END as progress_percentage
  FROM public.course_chapters ch
  JOIN public.course_lessons cl ON cl.chapter_id = ch.id
  LEFT JOIN public.student_lesson_progress slp ON slp.lesson_id = cl.id AND slp.student_id = p_student_id
  WHERE ch.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate chapter progress for a student
CREATE OR REPLACE FUNCTION public.calculate_chapter_progress(p_student_id UUID, p_chapter_id UUID)
RETURNS TABLE (
  total_lessons INTEGER,
  completed_lessons INTEGER,
  progress_percentage NUMERIC,
  all_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(cl.id)::INTEGER as total_lessons,
    COUNT(CASE WHEN slp.is_completed = true THEN 1 END)::INTEGER as completed_lessons,
    CASE 
      WHEN COUNT(cl.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN slp.is_completed = true THEN 1 END)::NUMERIC / COUNT(cl.id)::NUMERIC) * 100, 2)
      ELSE 0
    END as progress_percentage,
    CASE
      WHEN COUNT(cl.id) > 0 AND COUNT(cl.id) = COUNT(CASE WHEN slp.is_completed = true THEN 1 END) THEN true
      ELSE false
    END as all_completed
  FROM public.course_lessons cl
  LEFT JOIN public.student_lesson_progress slp ON slp.lesson_id = cl.id AND slp.student_id = p_student_id
  WHERE cl.chapter_id = p_chapter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger for capstone_projects updated_at
CREATE TRIGGER update_capstone_projects_updated_at
  BEFORE UPDATE ON public.capstone_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.lesson_quiz_questions IS 'Questions for quiz-type lessons with multiple choice options';
COMMENT ON TABLE public.student_lesson_progress IS 'Track student progress on individual lessons';
COMMENT ON TABLE public.student_quiz_attempts IS 'Track student quiz attempts and scores with auto-grading';
COMMENT ON TABLE public.capstone_projects IS 'Course final capstone projects';
COMMENT ON TABLE public.capstone_submissions IS 'Student submissions for capstone projects';
COMMENT ON COLUMN public.course_lessons.is_mandatory IS 'If true for quiz lessons, student must pass before proceeding';

