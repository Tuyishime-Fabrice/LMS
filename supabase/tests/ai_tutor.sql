-- Behaviour checks for 20261113000000_ai_tutor.sql.
-- Run against a scratch database only (never production), after the
-- migration, as the database owner:
--   psql -v ON_ERROR_STOP=1 -d <scratch> -f supabase/tests/ai_tutor.sql
-- Needs two profiles (one admin, one student), a course and a lesson; it
-- creates its own rows and rolls everything back.
BEGIN;

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

SELECT id AS admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1 \gset
SELECT id AS student_id FROM public.profiles WHERE role = 'student' ORDER BY id LIMIT 1 \gset
SELECT id AS other_id FROM public.profiles WHERE role = 'student' ORDER BY id DESC LIMIT 1 \gset
SELECT l.id AS lesson_id, ch.course_id AS course_id
  FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id LIMIT 1 \gset

-- The server (service role / owner) writes both sides of the conversation.
INSERT INTO public.tutor_messages (user_id, course_id, lesson_id, role, content) VALUES
  (:'student_id', :'course_id', :'lesson_id', 'user', 'What is a pivot table?'),
  (:'student_id', :'course_id', :'lesson_id', 'assistant', 'A pivot table summarises rows by category.'),
  (:'other_id',   :'course_id', :'lesson_id', 'user', 'Another learner''s question');

SELECT pg_temp.denied(
  format('INSERT INTO public.tutor_messages (user_id, course_id, role, content) VALUES (%L, %L, %L, %L)',
         :'student_id', :'course_id', 'system', 'x'),
  'only user and assistant roles are stored');

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', :'student_id', true);
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.tutor_messages), 'a learner reads only their own conversation');
SELECT pg_temp.denied(
  format('INSERT INTO public.tutor_messages (user_id, course_id, role, content) VALUES (%L, %L, %L, %L)',
         :'student_id', :'course_id', 'user', 'free question'),
  'a learner cannot insert rows (the daily limit cannot be bypassed)');
SELECT pg_temp.denied('DELETE FROM public.tutor_messages', 'a learner cannot delete rows');
SELECT pg_temp.denied('UPDATE public.tutor_messages SET content = ''edited''', 'a learner cannot edit rows');

SELECT set_config('request.jwt.claim.sub', :'admin_id', true);
SELECT pg_temp.ok((SELECT count(*) = 3 FROM public.tutor_messages), 'an admin can review every conversation');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.denied('SELECT count(*) FROM public.tutor_messages', 'signed-out visitors cannot read conversations');
RESET ROLE;

ROLLBACK;
