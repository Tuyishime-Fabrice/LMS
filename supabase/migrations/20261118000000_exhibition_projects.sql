-- Student project exhibition (public /exhibition page, managed from Admin → Exhibition).
-- The pages and generated types used this table, but no earlier migration created it.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.exhibition_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL DEFAULT '',
  student_image_url TEXT,
  course_name TEXT NOT NULL DEFAULT '',
  course_score NUMERIC NOT NULL DEFAULT 0 CHECK (course_score BETWEEN 0 AND 100),
  project_title TEXT NOT NULL DEFAULT '',
  project_description TEXT NOT NULL DEFAULT '',
  problem_definition TEXT,
  data_evidence TEXT,
  tools_methods TEXT,
  analysis TEXT,
  recommendations TEXT,
  project_link TEXT,
  technologies TEXT[] NOT NULL DEFAULT '{}',
  achievements TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exhibition_projects_display_order_idx ON public.exhibition_projects (display_order);

ALTER TABLE public.exhibition_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view exhibition projects" ON public.exhibition_projects;
CREATE POLICY "Anyone can view exhibition projects" ON public.exhibition_projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage exhibition projects" ON public.exhibition_projects;
CREATE POLICY "Admins manage exhibition projects" ON public.exhibition_projects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.exhibition_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exhibition_projects TO authenticated;

-- Photos of the students, shown publicly on the exhibition page.
INSERT INTO storage.buckets (id, name, public)
VALUES ('exhibition-images', 'exhibition-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view exhibition images" ON storage.objects;
CREATE POLICY "Anyone can view exhibition images" ON storage.objects
  FOR SELECT USING (bucket_id = 'exhibition-images');

DROP POLICY IF EXISTS "Admins can upload exhibition images" ON storage.objects;
CREATE POLICY "Admins can upload exhibition images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exhibition-images' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update exhibition images" ON storage.objects;
CREATE POLICY "Admins can update exhibition images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exhibition-images' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete exhibition images" ON storage.objects;
CREATE POLICY "Admins can delete exhibition images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exhibition-images' AND public.is_admin(auth.uid()));
