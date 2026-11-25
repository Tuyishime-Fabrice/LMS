-- Behaviour checks for 20261124000000_academy_experience.sql.
-- Scratch databases only, never production. Run after fixtures.sql,
-- connected as "authenticator" (the role the Supabase API uses), so the
-- protections apply exactly as they do for real requests:
--   psql postgresql://authenticator@host/<scratch> -v ON_ERROR_STOP=1 -f supabase/tests/academy_experience.sql
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
\set course  '00000000-0000-0000-0000-0000000000c1'
\set chapter '00000000-0000-0000-0000-0000000000d1'
\set capstone '00000000-0000-0000-0000-0000000000a1'

SET LOCAL ROLE authenticated;

-- 1. Discord links -------------------------------------------------------
SELECT pg_temp.act_as(:'teacher');
UPDATE public.courses SET discord_url = 'https://discord.gg/dataplus-cohort' WHERE id = :'course';
SELECT pg_temp.ok((SELECT discord_url FROM public.courses WHERE id = :'course') = 'https://discord.gg/dataplus-cohort', 'a course teacher sets a Discord invite');
SELECT pg_temp.denied(format('UPDATE public.courses SET discord_url = %L WHERE id = %L', 'javascript:alert(1)', :'course'), 'a non-Discord community URL is rejected');
SELECT pg_temp.denied(format('UPDATE public.courses SET discord_url = %L WHERE id = %L', 'https://evil.example/discord.gg', :'course'), 'a look-alike host is rejected');

-- 2. Tracks --------------------------------------------------------------
SELECT pg_temp.act_as(:'admin');
INSERT INTO public.learning_paths (id, slug, kind, title, is_published) VALUES
  ('00000000-0000-0000-0000-0000000001a1', 'sql-for-analysis', 'skill', 'SQL for analysis', true),
  ('00000000-0000-0000-0000-0000000001a2', 'data-analyst', 'career', 'Data analyst', false);
INSERT INTO public.learning_path_items (path_id, course_id, position) VALUES
  ('00000000-0000-0000-0000-0000000001a1', :'course', 0),
  ('00000000-0000-0000-0000-0000000001a2', :'course', 0);
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.learning_paths), 'an admin sees draft and published tracks');

SELECT pg_temp.act_as(:'student');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.learning_paths), 'a learner sees published tracks only');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.learning_path_items), 'a learner sees items of published tracks only');
SELECT pg_temp.denied('INSERT INTO public.learning_paths (slug, kind, title) VALUES (''mine'', ''skill'', ''Mine'')', 'a learner cannot create a track');

-- 3. Competitions --------------------------------------------------------
SELECT pg_temp.act_as(:'admin');
INSERT INTO public.competitions (id, slug, title, status, submission_deadline) VALUES
  ('00000000-0000-0000-0000-0000000002a1', 'kigali-prices', 'Kigali prices challenge', 'open', now() + interval '7 days'),
  ('00000000-0000-0000-0000-0000000002a2', 'draft-one', 'Draft', 'draft', NULL),
  ('00000000-0000-0000-0000-0000000002a3', 'finished', 'Finished', 'closed', now() - interval '1 day');

SELECT pg_temp.act_as(:'student');
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.competitions), 'draft competitions are hidden from participants');
INSERT INTO public.competition_registrations (competition_id, user_id) VALUES ('00000000-0000-0000-0000-0000000002a1', :'student');
SELECT pg_temp.denied(format('INSERT INTO public.competition_registrations (competition_id, user_id) VALUES (%L, %L)', '00000000-0000-0000-0000-0000000002a3', :'student'), 'registration is closed on a closed competition');
SELECT pg_temp.denied(format('INSERT INTO public.competition_registrations (competition_id, user_id) VALUES (%L, %L)', '00000000-0000-0000-0000-0000000002a1', :'second'), 'nobody registers someone else');
INSERT INTO public.competition_submissions (competition_id, user_id, title, submission_url, score, status)
  VALUES ('00000000-0000-0000-0000-0000000002a1', :'student', 'My notebook', 'https://colab.research.google.com/x', 99, 'scored');
SELECT pg_temp.ok((SELECT score IS NULL AND status = 'submitted' FROM public.competition_submissions LIMIT 1), 'a participant cannot score their own submission');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.get_competition_leaderboard('00000000-0000-0000-0000-0000000002a1')), 'no leaderboard before results are published');

SELECT pg_temp.act_as(:'second');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.competition_submissions), 'participants cannot read each other''s submissions');
SELECT pg_temp.denied(format('INSERT INTO public.competition_submissions (competition_id, user_id, title, submission_url) VALUES (%L, %L, %L, %L)', '00000000-0000-0000-0000-0000000002a1', :'second', 'x', 'https://x.test'), 'an unregistered user cannot submit');

SELECT pg_temp.act_as(:'admin');
UPDATE public.competition_submissions SET status = 'scored', score = 87.5 WHERE user_id = :'student';
UPDATE public.competitions SET results_published_at = now() - interval '1 minute' WHERE id = '00000000-0000-0000-0000-0000000002a1';
SELECT pg_temp.ok((SELECT score = 87.5 AND display_name ~ '^[A-Z][a-z]+ [A-Z]\.$' FROM public.get_competition_leaderboard('00000000-0000-0000-0000-0000000002a1') LIMIT 1), 'published leaderboard shows a shortened name and score');

-- 4. Learner preferences and insights -------------------------------------
SELECT pg_temp.act_as(:'student');
INSERT INTO public.learner_preferences (user_id, learning_goal, interests, research_consent) VALUES (:'student', 'grow_in_role', '{sql}', true);
SELECT pg_temp.ok((SELECT research_consent_at IS NOT NULL FROM public.learner_preferences), 'consent is time-stamped');
UPDATE public.learner_preferences SET research_consent = false WHERE user_id = :'student';
SELECT pg_temp.ok((SELECT research_consent_at IS NULL FROM public.learner_preferences), 'withdrawing consent clears the time stamp');
UPDATE public.learner_preferences SET research_consent = true WHERE user_id = :'student';
SELECT pg_temp.denied('SELECT public.get_onboarding_insights()', 'a learner cannot read insights');

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.learner_preferences), 'instructors cannot read onboarding answers');

SELECT pg_temp.act_as(:'admin');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.learner_preferences), 'admins cannot read raw onboarding answers');
SELECT pg_temp.ok((SELECT (public.get_onboarding_insights() ->> 'consenting_learners')::int = 1), 'admins see the number of consenting learners');
SELECT pg_temp.ok((SELECT (public.get_onboarding_insights() #>> '{questions,interest,suppressed}')::int = 1), 'an answer given by fewer than 5 learners is suppressed');

-- 5. Rubrics, feedback, history -----------------------------------------
SELECT pg_temp.act_as(:'teacher');
INSERT INTO public.course_lessons (id, chapter_id, title, content_type, content_url, order_index, rubric) VALUES
  ('00000000-0000-0000-0000-0000000003a1', :'chapter', 'Dashboard brief', 'assignment', '', 5,
   '{"criteria":[{"id":"c1","title":"Accuracy","levels":[{"label":"Good","points":10},{"label":"Weak","points":2}]}]}');
SELECT pg_temp.denied(format('UPDATE public.course_lessons SET rubric = %L WHERE id = %L', '{"criteria":[]}', '00000000-0000-0000-0000-0000000003a1'), 'an empty rubric is rejected');

SELECT pg_temp.act_as(:'student');
INSERT INTO public.assignment_submissions (id, lesson_id, student_id, description, grade, feedback, rubric_scores)
  VALUES ('00000000-0000-0000-0000-0000000003b1', '00000000-0000-0000-0000-0000000003a1', :'student', 'My work', 100, 'I deserve full marks here', '{"c1":10}');
SELECT pg_temp.ok((SELECT grade IS NULL AND rubric_scores IS NULL FROM public.assignment_submissions WHERE id = '00000000-0000-0000-0000-0000000003b1'), 'a learner cannot grade their own work');

SELECT pg_temp.act_as(:'teacher');
SELECT pg_temp.denied('UPDATE public.assignment_submissions SET grade = 80 WHERE id = ''00000000-0000-0000-0000-0000000003b1''', 'a mark without feedback is refused');
SELECT pg_temp.denied('UPDATE public.assignment_submissions SET grade = 80, feedback = ''Good.'' WHERE id = ''00000000-0000-0000-0000-0000000003b1''', 'a token comment is refused');
UPDATE public.assignment_submissions SET grade = 80, feedback = 'Clear dashboard; label the axes next time.', rubric_scores = '{"c1":{"points":8}}'
  WHERE id = '00000000-0000-0000-0000-0000000003b1';
UPDATE public.assignment_submissions SET grade = 85, feedback = 'Re-marked after moderation: axes are labelled.'
  WHERE id = '00000000-0000-0000-0000-0000000003b1';
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.grade_history WHERE submission_id = '00000000-0000-0000-0000-0000000003b1'), 'both published marks are kept in history');
SELECT pg_temp.denied('DELETE FROM public.grade_history', 'history cannot be deleted') ;

SELECT pg_temp.act_as(:'student');
SELECT pg_temp.ok((SELECT count(*) = 2 FROM public.grade_history WHERE submission_id = '00000000-0000-0000-0000-0000000003b1'), 'a learner reads their own grade history');
SELECT pg_temp.act_as(:'second');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.grade_history WHERE submission_id = '00000000-0000-0000-0000-0000000003b1'), 'other learners cannot read it');

RESET ROLE;
ROLLBACK;
