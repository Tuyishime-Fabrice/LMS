-- Add file_url column to capstone_projects so teachers can upload a PDF brief
ALTER TABLE public.capstone_projects
ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.capstone_projects.file_url IS 'Optional PDF file URL uploaded by the teacher as the capstone brief';

-- Add file_url column to capstone_submissions so students can upload documents
ALTER TABLE public.capstone_submissions
ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.capstone_submissions.file_url IS 'Optional document file URL uploaded by the student as part of their submission';
