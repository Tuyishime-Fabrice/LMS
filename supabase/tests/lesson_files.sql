-- Behaviour checks for 20261118000200_lesson_files_access.sql (who can read and change lesson files).
-- Run against a scratch database only (never production), after supabase/tests/fixtures.sql,
-- as the database owner:
--   psql -v ON_ERROR_STOP=1 -d <scratch> -f supabase/tests/lesson_files.sql
-- It creates its own rows and rolls everything back.
BEGIN;

\set admin    '''00000000-0000-0000-0000-00000000000a'''
\set teacher  '''00000000-0000-0000-0000-00000000000b'''
\set student  '''00000000-0000-0000-0000-00000000000c'''
\set student2 '''00000000-0000-0000-0000-00000000000d'''
\set outsider '''00000000-0000-0000-0000-0000000000a5'''
\set pending  '''00000000-0000-0000-0000-0000000000a6'''

CREATE OR REPLACE FUNCTION pg_temp.act_as(p uuid, r text DEFAULT 'authenticated') RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', coalesce(p::text, ''), true),
         set_config('request.jwt.claim.role', r, true);
$$;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', label; END IF;
  RAISE NOTICE 'ok - %', label;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.denied(stmt text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'ok - % (denied)', label; RETURN;
  END;
  RAISE EXCEPTION 'FAILED: % was allowed', label;
END $$;
-- Short names of the lesson files the current user can see.
CREATE OR REPLACE FUNCTION pg_temp.visible() RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(storage.filename(name), ',' ORDER BY storage.filename(name)), '')
  FROM storage.objects WHERE bucket_id = 'lesson-files';
$$;

-- Two more accounts: a learner enrolled only in the free course, and a teacher not yet approved.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:outsider, 'outsider@example.test', '{"full_name":"Olu Outsider"}'),
  (:pending,  'pending@example.test',  '{"full_name":"Pat Pending","role":"teacher"}');
UPDATE public.profiles SET role = 'teacher', teacher_approved = false WHERE id = :pending;

-- Paid course c1: one ordinary lesson file and one preview lesson. Free course c3: one lesson.
UPDATE public.course_lessons SET file_url = '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000e2/notes.pdf'
  WHERE id = '00000000-0000-0000-0000-0000000000e2';
INSERT INTO public.course_lessons (id, chapter_id, title, content_type, content_url, order_index, is_preview) VALUES
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000d1', 'Taster', 'pdf',
   'lesson-files/00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000e4/preview.pdf', 3, true);
INSERT INTO public.course_chapters (id, course_id, title, order_index) VALUES
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', 'Start', 0);
INSERT INTO public.course_lessons (id, chapter_id, title, content_type, content_url, order_index) VALUES
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d3', 'Free reading', 'pdf',
   'https://project.supabase.co/storage/v1/object/public/lesson-files/00000000-0000-0000-0000-0000000000c3/00000000-0000-0000-0000-0000000000e5/free.pdf', 0);
INSERT INTO public.course_enrollments (student_id, course_id) VALUES (:outsider, '00000000-0000-0000-0000-0000000000c3');

INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('lesson-files', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000e2/notes.pdf', :teacher),
  ('lesson-files', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000e4/preview.pdf', :teacher),
  ('lesson-files', '00000000-0000-0000-0000-0000000000c3/00000000-0000-0000-0000-0000000000e5/free.pdf', :teacher),
  ('lesson-files', 'capstone-submissions/00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000000c/work.pdf', :student);

-- Reading ----------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT pg_temp.act_as(NULL, 'anon');
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,preview.pdf', 'signed out: free and preview files only');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as(:outsider);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,preview.pdf', 'enrolled in a free course only: no paid files');

SELECT pg_temp.act_as(:pending);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,preview.pdf', 'unapproved teacher: no paid files, no student work');

SELECT pg_temp.act_as(:student2);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,notes.pdf,preview.pdf', 'enrolled learner: course files, not a classmate''s work');

SELECT pg_temp.act_as(:student);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,notes.pdf,preview.pdf,work.pdf', 'enrolled learner: course files and own work');

SELECT pg_temp.act_as(:teacher);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,notes.pdf,preview.pdf,work.pdf', 'course teacher: everything in their courses');

SELECT pg_temp.act_as(:admin);
SELECT pg_temp.ok(pg_temp.visible() = 'free.pdf,notes.pdf,preview.pdf,work.pdf', 'admin: everything');

-- Uploading --------------------------------------------------------------
SELECT pg_temp.act_as(:pending);
SELECT pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('lesson-files', 'uploads/x.pdf', '00000000-0000-0000-0000-0000000000a6')$$, 'unapproved teacher uploads course material');

SELECT pg_temp.act_as(:student);
SELECT pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('lesson-files', 'uploads/x.pdf', '00000000-0000-0000-0000-00000000000c')$$, 'learner uploads course material');
SELECT pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('lesson-files', 'capstone-submissions/00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000000d/fake.pdf', '00000000-0000-0000-0000-00000000000c')$$,
  'learner uploads into a classmate''s folder');
INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('lesson-files', 'capstone-submissions/00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-00000000000c/second.pdf', :student);
SELECT pg_temp.ok(pg_temp.visible() LIKE '%second.pdf%', 'learner uploads into own submission folder');

SELECT pg_temp.act_as(:teacher);
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('lesson-files', 'uploads/draft.pdf', :teacher);
SELECT pg_temp.ok(pg_temp.visible() LIKE '%draft.pdf%', 'approved teacher uploads and sees an unattached file');

SELECT pg_temp.act_as(:student);
SELECT pg_temp.ok(pg_temp.visible() NOT LIKE '%draft.pdf%', 'learner does not see a teacher''s unattached upload');

-- Changing and deleting --------------------------------------------------
SELECT pg_temp.act_as(:pending);
DELETE FROM storage.objects WHERE bucket_id = 'lesson-files';
UPDATE storage.objects SET name = name || '.bak' WHERE bucket_id = 'lesson-files';
SELECT pg_temp.act_as(:student2);
DELETE FROM storage.objects WHERE bucket_id = 'lesson-files';
UPDATE storage.objects SET name = name || '.bak' WHERE bucket_id = 'lesson-files';
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) = 6 AND bool_and(name NOT LIKE '%.bak') FROM storage.objects WHERE bucket_id = 'lesson-files'),
                  'other accounts cannot rename or delete course files or student work');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as(:teacher);
DELETE FROM storage.objects WHERE bucket_id = 'lesson-files' AND name LIKE '%/notes.pdf';
RESET ROLE;
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM storage.objects WHERE name LIKE '%/notes.pdf'), 'course teacher deletes a file from their course');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM storage.objects WHERE name LIKE '%/work.pdf'), 'student work stays put');

ROLLBACK;
