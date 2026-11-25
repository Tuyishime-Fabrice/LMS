-- Behaviour checks for 20261127000000_listing_and_verification.sql.
-- Scratch databases only. Run after fixtures.sql as "authenticator". Rolled back.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', label; END IF;
  RAISE NOTICE 'ok - %', label;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.act_as(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', p::text, true), set_config('request.jwt.claim.role', 'authenticated', true);
$$;

\set admin   '00000000-0000-0000-0000-00000000000a'
\set teacher '00000000-0000-0000-0000-00000000000b'
\set course  '00000000-0000-0000-0000-0000000000c1'

SET LOCAL ROLE authenticated;

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT listed FROM public.courses WHERE id = :'course'), 'existing courses stay listed');
UPDATE public.courses SET listed = false WHERE id = :'course';
SELECT pg_temp.ok((SELECT listed FROM public.courses WHERE id = :'course'), 'an instructor cannot change listing');
INSERT INTO public.courses (id, title, description, teacher_id, listed) VALUES ('00000000-0000-0000-0000-0000000006c1', 'New', 'x', :'teacher', false);
SELECT pg_temp.ok((SELECT listed FROM public.courses WHERE id = '00000000-0000-0000-0000-0000000006c1'), 'an instructor cannot create an unlisted course');

SELECT pg_temp.act_as(:'admin');
UPDATE public.courses SET listed = false WHERE id = :'course';
SELECT pg_temp.ok((SELECT NOT listed FROM public.courses WHERE id = :'course'), 'an admin unlists a course');

SELECT pg_temp.act_as(:'teacher');
UPDATE public.courses SET title = title || ' (v2)', listed = true WHERE id = :'course';
SELECT pg_temp.ok((SELECT NOT listed AND title LIKE '%(v2)' FROM public.courses WHERE id = :'course'), 'the instructor can still edit the course, but not re-list it');

SELECT pg_temp.act_as(:'admin');
INSERT INTO public.exhibition_projects (id, student_name, project_title) VALUES ('00000000-0000-0000-0000-0000000006e1', 'A', 'P');
SELECT pg_temp.ok((SELECT NOT outcomes_verified FROM public.exhibition_projects WHERE id = '00000000-0000-0000-0000-0000000006e1'), 'project outcomes start unverified');

RESET ROLE;
ROLLBACK;
