-- Create a public storage bucket for certificates
-- Certificates need to be publicly viewable (students preview/download, share links)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Admins can upload certificates" ON storage.objects;
CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND public.get_user_role(auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage certificates" ON storage.objects;
CREATE POLICY "Admins can manage certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND public.get_user_role(auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete certificates" ON storage.objects;
CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND public.get_user_role(auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Anyone can view certificates" ON storage.objects;
CREATE POLICY "Anyone can view certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');
