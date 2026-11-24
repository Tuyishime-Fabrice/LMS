-- Behaviour checks for 20261125000000_facilitators.sql.
-- Scratch databases only, never production. Run after fixtures.sql,
-- connected as "authenticator" so the protections apply as for real requests.
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

\set admin   '00000000-0000-0000-0000-00000000000a'
\set teacher '00000000-0000-0000-0000-00000000000b'
\set student '00000000-0000-0000-0000-00000000000c'
\set second  '00000000-0000-0000-0000-00000000000d'
\set fac     '00000000-0000-0000-0000-00000000000f'
\set course  '00000000-0000-0000-0000-0000000000c1'
\set other   '00000000-0000-0000-0000-0000000000c2'
\set chapter '00000000-0000-0000-0000-0000000000d1'
\set cohort  '00000000-0000-0000-0000-0000000000a9'

SET LOCAL ROLE authenticated;

-- Setup by the instructor: one learner in the cohort, one assignment, two submissions.
SELECT pg_temp.act_as(:'teacher');
UPDATE public.course_enrollments SET cohort_name = 'Cohort 1' WHERE course_id = :'course' AND student_id = :'student';
UPDATE public.course_enrollments SET cohort_name = NULL, cohort_id = NULL WHERE course_id = :'course' AND student_id = :'second';
INSERT INTO public.course_lessons (id, chapter_id, title, content_type, content_url, order_index)
  VALUES ('00000000-0000-0000-0000-0000000004a1', :'chapter', 'Brief', 'assignment', '', 9);
INSERT INTO public.cohorts (id, name, course_id, teacher_id) VALUES ('00000000-0000-0000-0000-0000000004c2', 'Other course cohort', :'other', :'teacher');
SELECT pg_temp.act_as(:'student');
INSERT INTO public.assignment_submissions (id, lesson_id, student_id, description) VALUES ('00000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-0000000004a1', :'student', 'Mine');
SELECT pg_temp.act_as(:'second');
INSERT INTO public.assignment_submissions (id, lesson_id, student_id, description) VALUES ('00000000-0000-0000-0000-0000000004b2', '00000000-0000-0000-0000-0000000004a1', :'second', 'Theirs');

-- 1. Who can assign ------------------------------------------------------
SELECT pg_temp.act_as(:'student');
SELECT pg_temp.denied(format('INSERT INTO public.course_staff (course_id, user_id) VALUES (%L, %L)', :'course', :'student'), 'a learner cannot assign facilitators');
SELECT pg_temp.denied(format('SELECT * FROM public.find_staffing_candidate(%L)', 'facilitator@example.test'), 'a learner cannot look up accounts');

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT id = :'fac' FROM public.find_staffing_candidate(' Facilitator@Example.test ')), 'the instructor finds an account by exact email');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.find_staffing_candidate('admin@example.test')), 'admins are never offered as facilitators');
SELECT pg_temp.denied(format('INSERT INTO public.course_staff (course_id, user_id) VALUES (%L, %L)', :'course', :'teacher'), 'the instructor cannot facilitate their own course');
SELECT pg_temp.denied(format('INSERT INTO public.course_staff (course_id, cohort_id, user_id) VALUES (%L, %L, %L)', :'course', '00000000-0000-0000-0000-0000000004c2', :'fac'), 'a cohort of another course is refused');
INSERT INTO public.course_staff (id, course_id, cohort_id, user_id) VALUES ('00000000-0000-0000-0000-0000000004d1', :'course', :'cohort', :'fac');
SELECT pg_temp.ok((SELECT assigned_by = :'teacher' FROM public.course_staff WHERE id = '00000000-0000-0000-0000-0000000004d1'), 'assigned_by records the instructor');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.get_course_staff(:'course')), 'the instructor lists the course facilitators');

-- 2. What a cohort facilitator can read -----------------------------------
SELECT pg_temp.act_as(:'fac');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.course_staff), 'a facilitator sees their own assignment');
SELECT pg_temp.denied(format('SELECT * FROM public.get_course_staff(%L)', :'course'), 'a facilitator cannot list other staff');
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(student_id = :'student') FROM public.course_enrollments WHERE course_id = :'course'), 'a cohort facilitator sees only their cohort''s enrolments');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.get_facilitated_learners()), 'the roster lists only assigned learners');
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(id = '00000000-0000-0000-0000-0000000004b1') FROM public.assignment_submissions), 'and only their submissions');
SELECT pg_temp.ok(public.can_access_lesson('00000000-0000-0000-0000-0000000000e2'), 'a facilitator can open the paid course''s lessons');
SELECT pg_temp.ok(public.facilitator_can_read_file('capstone-submissions/00000000-0000-0000-0000-0000000004a1/00000000-0000-0000-0000-00000000000c/work.xlsx'), 'a facilitator reads an assigned learner''s file');
SELECT pg_temp.ok(NOT public.facilitator_can_read_file('capstone-submissions/00000000-0000-0000-0000-0000000004a1/00000000-0000-0000-0000-00000000000d/work.xlsx'), 'but not another learner''s file');

-- 3. What a facilitator can write -----------------------------------------
UPDATE public.assignment_submissions SET grade = 90, feedback = 'Looks great to me, well structured work.' WHERE id = '00000000-0000-0000-0000-0000000004b1';
SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT grade IS NULL AND feedback IS NULL FROM public.assignment_submissions WHERE id = '00000000-0000-0000-0000-0000000004b1'), 'a facilitator cannot publish a mark');

SELECT pg_temp.act_as(:'fac');
INSERT INTO public.submission_reviews (submission_type, submission_id, suggested_grade, notes)
  VALUES ('assignment', '00000000-0000-0000-0000-0000000004b1', 78, 'Clear structure; check the totals in sheet 2.');
SELECT pg_temp.denied(format('INSERT INTO public.submission_reviews (submission_type, submission_id, suggested_grade) VALUES (%L, %L, 50)', 'assignment', '00000000-0000-0000-0000-0000000004b2'), 'a facilitator cannot review a learner outside their cohort');
SELECT pg_temp.denied(format('INSERT INTO public.submission_reviews (submission_type, submission_id, reviewer_id, suggested_grade) VALUES (%L, %L, %L, 50)', 'assignment', '00000000-0000-0000-0000-0000000004b1', :'teacher'), 'nobody writes a review in someone else''s name');
SELECT public.set_cohort_discord_url(:'cohort', 'https://discord.gg/cohort-one');
UPDATE public.cohorts SET price = 1 WHERE id = :'cohort';
SELECT pg_temp.denied(format('SELECT public.set_cohort_discord_url(%L, %L)', '00000000-0000-0000-0000-0000000004c2', 'https://discord.gg/x'), 'a facilitator cannot change another course''s cohort');
SELECT pg_temp.denied(format('INSERT INTO public.teacher_announcements (teacher_id, course_id, title, message) VALUES (%L, %L, %L, %L)', :'fac', :'course', 'Hi', 'Hello'), 'a cohort facilitator cannot post course-wide announcements');

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT discord_url = 'https://discord.gg/cohort-one' AND price IS DISTINCT FROM 1 FROM public.cohorts WHERE id = :'cohort'), 'the Discord link changed and nothing else did');
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(suggested_grade = 78) FROM public.submission_reviews), 'the instructor reads the provisional review');
INSERT INTO public.course_staff (course_id, user_id) VALUES (:'course', :'fac');

SELECT pg_temp.act_as(:'fac');
INSERT INTO public.teacher_announcements (teacher_id, course_id, title, message) VALUES (:'fac', :'course', 'Office hours', 'Thursday 18:00 on Discord.');
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.course_enrollments WHERE course_id = :'course'), 'a course-wide facilitator sees every learner of the course');

-- 4. Learners and the announcement fix ------------------------------------
SELECT pg_temp.act_as(:'student');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.submission_reviews), 'learners never see provisional reviews');
SELECT pg_temp.denied(format('INSERT INTO public.teacher_announcements (teacher_id, course_id, title, message) VALUES (%L, %L, %L, %L)', :'student', :'course', 'Fake', 'Not from staff'), 'a learner cannot post an announcement to a course');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.get_facilitated_learners()), 'a learner facilitates nobody');

-- 5. Removal --------------------------------------------------------------
SELECT pg_temp.act_as(:'teacher');
DELETE FROM public.course_staff WHERE user_id = :'fac';
SELECT pg_temp.act_as(:'fac');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.assignment_submissions WHERE lesson_id = '00000000-0000-0000-0000-0000000004a1'), 'after removal the facilitator sees nothing');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.submission_reviews), 'not even their own review');

RESET ROLE;
ROLLBACK;
