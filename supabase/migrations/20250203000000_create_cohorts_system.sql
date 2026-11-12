-- Create cohorts table
-- Note: course_id is optional (nullable) to allow cohorts without specific courses
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

-- Add foreign key constraints only if the referenced tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    ALTER TABLE public.cohorts 
    ADD CONSTRAINT cohorts_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.cohorts 
    ADD CONSTRAINT cohorts_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create cohort join requests table
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

-- Add foreign key constraints
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cohorts') THEN
    ALTER TABLE public.cohort_join_requests 
    ADD CONSTRAINT cohort_join_requests_cohort_id_fkey 
    FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.cohort_join_requests 
    ADD CONSTRAINT cohort_join_requests_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_join_requests ENABLE ROW LEVEL SECURITY;

-- Cohorts policies
CREATE POLICY "Anyone can view active cohorts"
  ON public.cohorts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Teachers can create cohorts"
  ON public.cohorts FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their own cohorts"
  ON public.cohorts FOR UPDATE
  USING (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can delete their own cohorts"
  ON public.cohorts FOR DELETE
  USING (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Cohort join requests policies
CREATE POLICY "Students can view their own join requests"
  ON public.cohort_join_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view join requests for their cohorts"
  ON public.cohort_join_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT teacher_id FROM public.cohorts WHERE id = cohort_join_requests.cohort_id
    )
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

-- Add triggers for updated_at (only if the function exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_cohorts_updated_at
      BEFORE UPDATE ON public.cohorts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_cohort_join_requests_updated_at
      BEFORE UPDATE ON public.cohort_join_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cohorts_teacher_id ON public.cohorts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_course_id ON public.cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_is_active ON public.cohorts(is_active);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_cohort_id ON public.cohort_join_requests(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_student_id ON public.cohort_join_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_status ON public.cohort_join_requests(status);
