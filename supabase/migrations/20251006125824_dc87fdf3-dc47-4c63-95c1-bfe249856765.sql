-- Create scheduled_classes table
CREATE TABLE public.scheduled_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meet_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_classes ENABLE ROW LEVEL SECURITY;

-- Teachers can manage scheduled classes for their courses
CREATE POLICY "Teachers can manage their scheduled classes"
ON public.scheduled_classes
FOR ALL
USING (
  auth.uid() = teacher_id AND
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = scheduled_classes.course_id
    AND courses.teacher_id = auth.uid()
  )
);

-- Students can view scheduled classes for enrolled courses
CREATE POLICY "Students can view scheduled classes for enrolled courses"
ON public.scheduled_classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_enrollments.course_id = scheduled_classes.course_id
    AND course_enrollments.student_id = auth.uid()
  )
);

-- Teachers can view all scheduled classes for their courses
CREATE POLICY "Teachers can view their scheduled classes"
ON public.scheduled_classes
FOR SELECT
USING (
  auth.uid() = teacher_id
);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_classes_updated_at
BEFORE UPDATE ON public.scheduled_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();