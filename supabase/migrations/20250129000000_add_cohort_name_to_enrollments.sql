-- Add cohort_name column to course_enrollments table
ALTER TABLE public.course_enrollments
ADD COLUMN IF NOT EXISTS cohort_name TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_cohort_name 
ON public.course_enrollments(cohort_name);

-- Add comment
COMMENT ON COLUMN public.course_enrollments.cohort_name IS 'Optional cohort/group name for organizing students within a course';
