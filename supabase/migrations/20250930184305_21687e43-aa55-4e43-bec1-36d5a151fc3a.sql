-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('student', 'teacher');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their own courses"
  ON public.courses FOR UPDATE
  USING (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can delete their own courses"
  ON public.courses FOR DELETE
  USING (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Create course enrollments table
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view enrollments for their courses"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Create course materials table
CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students and teachers can view materials"
  ON public.course_materials FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = course_materials.course_id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers can create materials for their courses"
  ON public.course_materials FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can update materials for their courses"
  ON public.course_materials FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can delete materials from their courses"
  ON public.course_materials FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students and teachers can view assignments"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = assignments.course_id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers can manage assignments for their courses"
  ON public.assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own submissions"
  ON public.assignment_submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their course assignments"
  ON public.assignment_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON a.course_id = c.id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can submit assignments"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can update submissions (for grading)"
  ON public.assignment_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON a.course_id = c.id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students and teachers can view quizzes"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = quizzes.course_id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers can manage quizzes for their courses"
  ON public.quizzes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students and teachers can view quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON q.course_id = c.id
      WHERE q.id = quiz_id AND c.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.course_enrollments e ON q.course_id = e.course_id
      WHERE q.id = quiz_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage quiz questions"
  ON public.quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON q.course_id = c.id
      WHERE q.id = quiz_id AND c.teacher_id = auth.uid()
    )
  );

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB,
  score INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view quiz attempts for their courses"
  ON public.quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON q.course_id = c.id
      WHERE q.id = quiz_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can create quiz attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own quiz attempts"
  ON public.quiz_attempts FOR UPDATE
  USING (auth.uid() = student_id);

-- Create group chats table
CREATE TABLE public.group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view group chats"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = group_chats.course_id AND student_id = auth.uid())
  );

CREATE POLICY "Teachers can create group chats for their courses"
  ON public.group_chats FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course members can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chats gc
      JOIN public.courses c ON gc.course_id = c.id
      WHERE gc.id = group_chat_id AND c.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.group_chats gc
      JOIN public.course_enrollments e ON gc.course_id = e.course_id
      WHERE gc.id = group_chat_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Course members can send chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    (
      EXISTS (
        SELECT 1 FROM public.group_chats gc
        JOIN public.courses c ON gc.course_id = c.id
        WHERE gc.id = group_chat_id AND c.teacher_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.group_chats gc
        JOIN public.course_enrollments e ON gc.course_id = e.course_id
        WHERE gc.id = group_chat_id AND e.student_id = auth.uid()
      )
    )
  );

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();