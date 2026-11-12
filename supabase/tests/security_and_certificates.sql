-- Behaviour checks for the 2026-11-12 migrations.
-- Run against a scratch database only (never production):
--   psql -v ON_ERROR_STOP=1 -U authenticator -d <scratch> -f supabase/tests/security_and_certificates.sql
-- Expects the fixtures created by supabase/tests/fixtures.sql and a session
-- whose login role is "authenticator" (as PostgREST connects).
\set admin    '''00000000-0000-0000-0000-00000000000a'''
\set teacher  '''00000000-0000-0000-0000-00000000000b'''
\set student  '''00000000-0000-0000-0000-00000000000c'''
\set student2 '''00000000-0000-0000-0000-00000000000d'''

CREATE OR REPLACE FUNCTION pg_temp.act_as(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', p::text, false),
         set_config('request.jwt.claim.role', 'authenticated', false);
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

SET ROLE authenticated;

-- 1. Profiles -----------------------------------------------------------
SELECT pg_temp.act_as(:student);
UPDATE public.profiles SET role = 'admin', pricing_tier = 'partner', teacher_approved = true, is_suspended = false
  WHERE id = :student;
SELECT pg_temp.ok((SELECT role::text = 'student' AND pricing_tier = 'standard' AND NOT coalesce(teacher_approved, false)
                   FROM public.profiles WHERE id = :student), 'student cannot promote or re-price themselves');
UPDATE public.profiles SET full_name = 'Renamed Student' WHERE id = :student;
SELECT pg_temp.ok((SELECT full_name = 'Renamed Student' FROM public.profiles WHERE id = :student),
                  'student can still edit ordinary profile fields');
UPDATE public.profiles SET role = 'teacher' WHERE id = :student;
SELECT pg_temp.ok((SELECT role::text = 'student' FROM public.profiles WHERE id = :student),
                  'role is fixed once onboarding is complete');
SELECT pg_temp.act_as(:student2);
UPDATE public.profiles SET role = 'teacher' WHERE id = :student2;
SELECT pg_temp.ok((SELECT role::text = 'teacher' FROM public.profiles WHERE id = :student2),
                  'student/teacher choice is allowed before onboarding');
UPDATE public.profiles SET role = 'student' WHERE id = :student2;

-- 2. Enrolments ---------------------------------------------------------
SELECT pg_temp.act_as(:student);
SELECT pg_temp.denied(format('INSERT INTO public.course_enrollments (student_id, course_id) VALUES (%L, %L)',
                             '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c2'),
                      'self-enrolment in a paid course');
INSERT INTO public.course_enrollments (student_id, course_id)
  VALUES (:student, '00000000-0000-0000-0000-0000000000c3');
SELECT pg_temp.ok(true, 'self-enrolment in a free course');

-- 3. Server-only functions ---------------------------------------------
SELECT pg_temp.denied($$SELECT public.update_payment_status('REF-1', 'success')$$, 'update_payment_status from a user session');
SELECT pg_temp.denied($$SELECT public.mark_course_completed('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000c1')$$,
                      'mark_course_completed from a user session');

-- 4. Quizzes ------------------------------------------------------------
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.lesson_quiz_questions), 'students cannot read the answer table');
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.get_lesson_quiz('00000000-0000-0000-0000-0000000000e3')),
                  'quiz questions are served without answers');
SELECT pg_temp.denied($$INSERT INTO public.student_quiz_attempts (student_id, lesson_id, answers, score, total_points, passed)
                        VALUES ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000e3', '{}', 99, 2, true)$$,
                      'writing a quiz score directly');
SELECT pg_temp.ok((public.submit_lesson_quiz('00000000-0000-0000-0000-0000000000e3',
                   '{"00000000-0000-0000-0000-0000000000f1":"a","00000000-0000-0000-0000-0000000000f2":"x"}')->>'score')::int = 1,
                  'quiz is marked in the database (1 of 2)');
SELECT pg_temp.ok((public.submit_lesson_quiz('00000000-0000-0000-0000-0000000000e3',
                   '{"00000000-0000-0000-0000-0000000000f1":"a","00000000-0000-0000-0000-0000000000f2":"b"}')->>'passed')::boolean,
                  'a passing attempt is recorded');
SELECT pg_temp.ok((SELECT is_completed FROM public.student_lesson_progress
                   WHERE student_id = :student AND lesson_id = '00000000-0000-0000-0000-0000000000e3'),
                  'passing the quiz completes the lesson');

-- 5. Resume and progress ------------------------------------------------
SELECT public.record_lesson_visit('00000000-0000-0000-0000-0000000000e1');
INSERT INTO public.student_lesson_progress (student_id, lesson_id, is_completed, completed_at)
  VALUES (:student, '00000000-0000-0000-0000-0000000000e1', true, now())
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET is_completed = true, completed_at = now();
SELECT public.record_lesson_visit('00000000-0000-0000-0000-0000000000e1');
SELECT pg_temp.ok((SELECT is_completed FROM public.student_lesson_progress
                   WHERE student_id = :student AND lesson_id = '00000000-0000-0000-0000-0000000000e1'),
                  'reopening a finished lesson keeps it finished');
SELECT pg_temp.ok((SELECT last_lesson_id = '00000000-0000-0000-0000-0000000000e1' AND progress_percentage = 67
                   FROM public.course_enrollments WHERE student_id = :student AND course_id = '00000000-0000-0000-0000-0000000000c1'),
                  'enrolment stores the resume point and 2 of 3 lessons = 67%');

-- 6. Submissions, grading and the certificate ---------------------------
INSERT INTO public.capstone_submissions (capstone_project_id, student_id, description, grade, feedback)
  VALUES ('00000000-0000-0000-0000-0000000000a1', :student, 'My project', 100, 'self praise');
SELECT pg_temp.ok((SELECT grade IS NULL AND feedback IS NULL FROM public.capstone_submissions WHERE student_id = :student),
                  'a student cannot grade their own capstone');
UPDATE public.capstone_submissions SET grade = 95 WHERE student_id = :student;
SELECT pg_temp.ok((SELECT grade IS NULL FROM public.capstone_submissions WHERE student_id = :student),
                  'nor by updating it afterwards');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.certificates WHERE student_id = :student), 'no certificate before grading');

SELECT pg_temp.act_as(:student2);
INSERT INTO public.capstone_submissions (capstone_project_id, student_id, description)
  VALUES ('00000000-0000-0000-0000-0000000000a1', :student2, 'Second project');

SELECT pg_temp.act_as(:teacher);
UPDATE public.capstone_submissions SET grade = 64, feedback = 'Close', graded_at = now(), graded_by = :teacher
  WHERE student_id = :student2;
UPDATE public.capstone_submissions SET grade = 65, feedback = 'Meets the bar', graded_at = now(), graded_by = :teacher
  WHERE student_id = :student;

SELECT pg_temp.act_as(:student);
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(status = 'approved' AND issue_source = 'auto'
                          AND certificate_number ~ '^DPA-[0-9]{4}-[0-9]{6}$' AND length(verification_code) = 16)
                   FROM public.certificates WHERE student_id = :student),
                  'a capstone graded 65 issues one numbered certificate');
SELECT pg_temp.ok((SELECT completed FROM public.course_enrollments
                   WHERE student_id = :student AND course_id = '00000000-0000-0000-0000-0000000000c1'),
                  'the enrolment is marked complete');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.notifications WHERE user_id = :student AND type = 'certificate_issued'),
                  'the learner is notified in-app');
SELECT pg_temp.ok((SELECT count(*) >= 2 AND bool_and(email_status = 'pending') FROM public.notifications
                   WHERE user_id = :student AND type IN ('submission_received', 'submission_graded')),
                  'submission events are queued for email');
SELECT pg_temp.ok((SELECT bool_and(email_status IS NULL) FROM public.notifications
                   WHERE user_id = :student AND type NOT IN ('submission_received', 'submission_graded',
                                                              'application_received', 'application_decision')),
                  'everything else stays in-app only');

SELECT pg_temp.act_as(:student2);
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.certificates WHERE student_id = :student2),
                  'a capstone graded 64 does not issue a certificate');

-- Re-grading must not create a second certificate or a new number.
SELECT pg_temp.act_as(:teacher);
UPDATE public.capstone_submissions SET grade = 80 WHERE student_id = :student;
SELECT pg_temp.act_as(:student);
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.certificates WHERE student_id = :student), 'still exactly one certificate');

-- 7. Verification and revocation ----------------------------------------
SELECT set_config('test.code', (SELECT verification_code FROM public.certificates WHERE student_id = :student), false);
SELECT set_config('test.cert', (SELECT id::text FROM public.certificates WHERE student_id = :student), false);
SELECT pg_temp.denied(format('SELECT public.revoke_certificate(%L, %L)', current_setting('test.cert'), 'because'),
                      'revoking as a student');
RESET ROLE; SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false);
SELECT pg_temp.ok((SELECT is_valid AND holder_name = 'Renamed Student' AND course_title = 'Data Analysis'
                   FROM public.verify_certificate(lower(current_setting('test.code')))),
                  'anyone can verify a certificate by its code');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.verify_certificate('NOT-A-REAL-CODE')), 'unknown codes return nothing');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.certificates), 'the certificates table itself stays closed to the public');
RESET ROLE; SET ROLE authenticated;
SELECT pg_temp.act_as(:admin);
SELECT public.revoke_certificate(current_setting('test.cert')::uuid, 'Issued in error');
RESET ROLE; SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT pg_temp.ok((SELECT NOT is_valid AND status = 'revoked' FROM public.verify_certificate(current_setting('test.code'))),
                  'a revoked certificate verifies as not valid');
RESET ROLE; SET ROLE authenticated;
SELECT pg_temp.act_as(:teacher);
UPDATE public.capstone_submissions SET grade = 90 WHERE student_id = :student;
SELECT pg_temp.act_as(:admin);
SELECT pg_temp.ok((SELECT status = 'revoked' FROM public.certificates WHERE id = current_setting('test.cert')::uuid),
                  'a revoked certificate is not re-issued automatically');

-- 8. Messages -----------------------------------------------------------
SELECT pg_temp.act_as(:student);
SELECT pg_temp.ok(public.mark_conversation_read('00000000-0000-0000-0000-0000000000b1') = 1,
                  'the recipient can mark a conversation as read');
SELECT pg_temp.act_as(:student2);
SELECT pg_temp.denied($$SELECT public.mark_conversation_read('00000000-0000-0000-0000-0000000000b1')$$,
                      'marking someone else''s conversation');

-- 9. Applications -------------------------------------------------------
SELECT pg_temp.ok((SELECT count(*) = 1 AND bool_and(email_status = 'pending') FROM public.notifications
                   WHERE user_id = :student2 AND type = 'application_received'),
                  'an application is acknowledged and queued for email');
\echo ALL CHECKS PASSED
