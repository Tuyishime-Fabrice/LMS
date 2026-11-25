-- Behaviour checks for 20261126000000_drafts_and_cohort_announcements.sql.
-- Scratch databases only. Run after fixtures.sql, connected as "authenticator".
-- Everything is rolled back.
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
  EXCEPTION WHEN insufficient_privilege OR check_violation OR raise_exception THEN
    RAISE NOTICE 'ok - % (denied)', label; RETURN;
  END;
  RAISE EXCEPTION 'FAILED: % was allowed', label;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.act_as(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', p::text, true), set_config('request.jwt.claim.role', 'authenticated', true);
$$;

\set teacher '00000000-0000-0000-0000-00000000000b'
\set student '00000000-0000-0000-0000-00000000000c'
\set second  '00000000-0000-0000-0000-00000000000d'
\set fac     '00000000-0000-0000-0000-00000000000f'
\set course  '00000000-0000-0000-0000-0000000000c1'
\set other   '00000000-0000-0000-0000-0000000000c2'
\set chapter '00000000-0000-0000-0000-0000000000d1'
\set cohort  '00000000-0000-0000-0000-0000000000a9'

SET LOCAL ROLE authenticated;

-- Setup: Sam in Cohort 1, Sia outside it; Fay facilitates Cohort 1; a cohort and a module on another course.
SELECT pg_temp.act_as(:'teacher');
UPDATE public.course_enrollments SET cohort_name = 'Cohort 1' WHERE course_id = :'course' AND student_id = :'student';
UPDATE public.course_enrollments SET cohort_name = NULL, cohort_id = NULL WHERE course_id = :'course' AND student_id = :'second';
INSERT INTO public.course_staff (course_id, cohort_id, user_id) VALUES (:'course', :'cohort', :'fac');
INSERT INTO public.cohorts (id, name, course_id, teacher_id) VALUES ('00000000-0000-0000-0000-0000000005c2', 'Other cohort', :'other', :'teacher');
INSERT INTO public.course_chapters (id, course_id, title, order_index) VALUES ('00000000-0000-0000-0000-0000000005d2', :'other', 'Other module', 0);

-- 1. Cohort announcements --------------------------------------------------
INSERT INTO public.teacher_announcements (id, teacher_id, course_id, cohort_id, title, message)
  VALUES ('00000000-0000-0000-0000-0000000005a1', :'teacher', :'course', :'cohort', 'Cohort 1 only', 'Thursday session moves to 19:00.');
INSERT INTO public.teacher_announcements (id, teacher_id, course_id, title, message)
  VALUES ('00000000-0000-0000-0000-0000000005a2', :'teacher', :'course', 'Everyone', 'Module 2 is open.');
SELECT pg_temp.denied(format('INSERT INTO public.teacher_announcements (teacher_id, course_id, cohort_id, title, message) VALUES (%L, %L, %L, %L, %L)',
  :'teacher', :'course', '00000000-0000-0000-0000-0000000005c2', 'x', 'y'), 'a cohort of another course is refused');

SELECT pg_temp.act_as(:'student');
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.teacher_announcements WHERE id IN ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a2')), 'a cohort member reads the cohort and the course announcement');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.notifications WHERE data ->> 'announcement_id' = '00000000-0000-0000-0000-0000000005a1'), 'the cohort member is notified');
SELECT pg_temp.denied(format('INSERT INTO public.teacher_announcements (teacher_id, course_id, cohort_id, title, message) VALUES (%L, %L, %L, %L, %L)',
  :'student', :'course', :'cohort', 'Fake', 'Not staff'), 'a learner cannot post to a cohort');

SELECT pg_temp.act_as(:'second');
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(id = '00000000-0000-0000-0000-0000000005a2') FROM public.teacher_announcements WHERE id IN ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a2')), 'a learner outside the cohort sees only the course announcement');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.notifications WHERE data ->> 'announcement_id' = '00000000-0000-0000-0000-0000000005a1'), 'and is not notified of the cohort one');

SELECT pg_temp.act_as(:'fac');
INSERT INTO public.teacher_announcements (id, teacher_id, course_id, cohort_id, title, message)
  VALUES ('00000000-0000-0000-0000-0000000005a3', :'fac', :'course', :'cohort', 'Office hours', 'Tonight 18:00 on Discord.');
SELECT pg_temp.ok((SELECT count(*) = 3 FROM public.teacher_announcements WHERE course_id = :'course' AND id::text LIKE '00000000-0000-0000-0000-0000000005a%'), 'a cohort facilitator posts to their cohort and reads their scope');
SELECT pg_temp.denied(format('INSERT INTO public.teacher_announcements (teacher_id, course_id, title, message) VALUES (%L, %L, %L, %L)', :'fac', :'course', 'All', 'Everyone'), 'but not course-wide');
SELECT pg_temp.denied(format('UPDATE public.teacher_announcements SET course_id = %L, cohort_id = NULL WHERE id = %L', :'other', '00000000-0000-0000-0000-0000000005a3'), 'an author cannot move an announcement to another course');
SELECT pg_temp.denied(format('UPDATE public.teacher_announcements SET cohort_id = NULL WHERE id = %L', '00000000-0000-0000-0000-0000000005a3'), 'nor widen it beyond their cohort');
UPDATE public.teacher_announcements SET message = 'Tonight 18:30 on Discord.' WHERE id = '00000000-0000-0000-0000-0000000005a3';
SELECT pg_temp.ok((SELECT message LIKE '%18:30%' FROM public.teacher_announcements WHERE id = '00000000-0000-0000-0000-0000000005a3'), 'an author can still correct their own text');

-- 2. Assignment drafts -----------------------------------------------------
INSERT INTO public.assignment_drafts (id, course_id, chapter_id, title, instructions, due_date, rubric, lesson_id, review_note)
  VALUES ('00000000-0000-0000-0000-0000000005b1', :'course', :'chapter', 'Mini dashboard', 'Build one page.', now() + interval '7 days',
          '{"criteria":[{"id":"c1","title":"Clarity","levels":[{"label":"Clear","points":5},{"label":"Unclear","points":1}]}]}',
          '00000000-0000-0000-0000-0000000000e1', 'self-approved');
SELECT pg_temp.ok((SELECT author_id = :'fac' AND lesson_id IS NULL AND review_note IS NULL AND status = 'draft' FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1'), 'a facilitator creates a draft; review fields cannot be preset');
SELECT pg_temp.denied(format('INSERT INTO public.assignment_drafts (course_id, chapter_id, title, status) VALUES (%L, %L, %L, %L)', :'course', :'chapter', 'x', 'approved'), 'a facilitator cannot approve their own draft');
SELECT pg_temp.denied(format('INSERT INTO public.assignment_drafts (course_id, chapter_id, title) VALUES (%L, %L, %L)', :'course', '00000000-0000-0000-0000-0000000005d2', 'x'), 'the module must belong to the course');
SELECT pg_temp.denied(format('INSERT INTO public.course_lessons (chapter_id, title, content_type, content_url, order_index) VALUES (%L, %L, %L, %L, 99)', :'chapter', 'Sneaky', 'assignment', ''), 'a facilitator cannot write lessons directly');
UPDATE public.assignment_drafts SET status = 'submitted' WHERE id = '00000000-0000-0000-0000-0000000005b1';
SELECT pg_temp.ok((SELECT submitted_at IS NOT NULL FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1'), 'submitting is time-stamped');
SELECT pg_temp.denied(format('UPDATE public.assignment_drafts SET title = %L WHERE id = %L', 'Changed', '00000000-0000-0000-0000-0000000005b1'), 'a submitted draft is locked for the author');
SELECT pg_temp.denied(format('SELECT public.approve_assignment_draft(%L)', '00000000-0000-0000-0000-0000000005b1'), 'a facilitator cannot call approve');

SELECT pg_temp.act_as(:'second');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.assignment_drafts), 'learners never see drafts');
SELECT pg_temp.denied(format('INSERT INTO public.assignment_drafts (course_id, chapter_id, title) VALUES (%L, %L, %L)', :'course', :'chapter', 'x'), 'a learner cannot draft');

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.notifications WHERE type = 'assignment_draft_submitted' AND data ->> 'draft_id' = '00000000-0000-0000-0000-0000000005b1'), 'the instructor is notified of the submission');
SELECT pg_temp.denied(format('SELECT public.return_assignment_draft(%L, %L)', '00000000-0000-0000-0000-0000000005b1', 'No.'), 'returning needs a real note');
SELECT public.return_assignment_draft('00000000-0000-0000-0000-0000000005b1', 'Add a due time and a rubric level for partial work.');

SELECT pg_temp.act_as(:'fac');
SELECT pg_temp.ok((SELECT status = 'changes_requested' AND review_note LIKE 'Add a due time%' FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1'), 'the author sees the instructor''s note');
UPDATE public.assignment_drafts SET title = 'Mini dashboard (v2)', status = 'submitted' WHERE id = '00000000-0000-0000-0000-0000000005b1';

SELECT pg_temp.act_as(:'teacher');
SELECT set_config('test.lesson', public.approve_assignment_draft('00000000-0000-0000-0000-0000000005b1')::text, true);
SELECT pg_temp.ok((SELECT content_type = 'assignment' AND title = 'Mini dashboard (v2)' AND chapter_id = :'chapter' AND rubric IS NOT NULL AND due_date IS NOT NULL
                   FROM public.course_lessons WHERE id = current_setting('test.lesson')::uuid), 'approval creates the assignment lesson with its rubric and due date');
SELECT pg_temp.ok((SELECT status = 'approved' AND lesson_id = current_setting('test.lesson')::uuid FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1'), 'the draft records the lesson');
SELECT pg_temp.denied(format('SELECT public.approve_assignment_draft(%L)', '00000000-0000-0000-0000-0000000005b1'), 'a draft is approved once');

SELECT pg_temp.act_as(:'fac');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.notifications WHERE type = 'assignment_draft_approved'), 'the author is notified of the approval');
DELETE FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1';
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.assignment_drafts WHERE id = '00000000-0000-0000-0000-0000000005b1'), 'an approved draft cannot be deleted');

RESET ROLE;
ROLLBACK;
