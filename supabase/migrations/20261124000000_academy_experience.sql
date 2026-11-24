-- =====================================================================
-- DATA+ Academy experience (2026-11-24)
--
-- Additive and idempotent: no table, column or row is dropped, and every
-- statement can run twice. Review, back up, then apply by hand in the
-- SQL editor. Never replay it on production without a backup.
--
--  1. Cohort community: Discord links on courses and cohorts
--  2. Skill and career tracks (learning_paths, learning_path_items)
--  3. Competitions, registrations and submissions
--  4. Learner preferences from onboarding, research consent, and an
--     admin-only aggregate (no raw answers leave the owner's row)
--  5. Rubrics, written feedback required with every mark, grade history
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cohort community (Discord). A cohort link overrides the course link.
-- ---------------------------------------------------------------------
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discord_url text;
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS discord_url text;

DO $$ BEGIN
  ALTER TABLE public.courses ADD CONSTRAINT courses_discord_url_format
    CHECK (discord_url IS NULL OR discord_url ~ '^https://(discord\.gg|discord\.com|www\.discord\.com)/[A-Za-z0-9/_-]+$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.cohorts ADD CONSTRAINT cohorts_discord_url_format
    CHECK (discord_url IS NULL OR discord_url ~ '^https://(discord\.gg|discord\.com|www\.discord\.com)/[A-Za-z0-9/_-]+$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.courses.discord_url IS 'Invite or channel URL for the course community on Discord. Replaces in-platform chat.';
COMMENT ON COLUMN public.cohorts.discord_url IS 'Invite or channel URL for this cohort on Discord; overrides courses.discord_url.';

-- ---------------------------------------------------------------------
-- 2. Skill and career tracks. Courses are reused, never copied.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text NOT NULL CHECK (kind IN ('skill', 'career')),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  summary text,
  description text,
  outcomes text[] NOT NULL DEFAULT '{}',
  target_role text,
  competencies text[] NOT NULL DEFAULT '{}',
  level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours integer CHECK (estimated_hours IS NULL OR estimated_hours > 0),
  language text,
  is_published boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_path_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  milestone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, course_id)
);
CREATE INDEX IF NOT EXISTS learning_path_items_path_idx ON public.learning_path_items (path_id, position);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published tracks are public" ON public.learning_paths;
CREATE POLICY "Published tracks are public" ON public.learning_paths
  FOR SELECT USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage tracks" ON public.learning_paths;
CREATE POLICY "Admins manage tracks" ON public.learning_paths
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Items of published tracks are public" ON public.learning_path_items;
CREATE POLICY "Items of published tracks are public" ON public.learning_path_items
  FOR SELECT USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.is_published)
  );
DROP POLICY IF EXISTS "Admins manage track items" ON public.learning_path_items;
CREATE POLICY "Admins manage track items" ON public.learning_path_items
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.learning_paths, public.learning_path_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.learning_paths, public.learning_path_items TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Competitions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  summary text,
  description text,
  eligibility text,
  rules text,
  prizes text,
  submission_instructions text,
  dataset_url text CHECK (dataset_url IS NULL OR dataset_url ~ '^https://'),
  discord_url text CHECK (discord_url IS NULL OR discord_url ~ '^https://(discord\.gg|discord\.com|www\.discord\.com)/[A-Za-z0-9/_-]+$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'upcoming', 'open', 'judging', 'closed')),
  open_to_public boolean NOT NULL DEFAULT true,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  submission_deadline timestamptz,
  results_published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competition_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name text,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'withdrawn', 'disqualified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.competition_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  submission_url text NOT NULL CHECK (submission_url ~ '^https://'),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'scored', 'rejected')),
  score numeric CHECK (score IS NULL OR score >= 0),
  judge_feedback text,
  scored_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scored_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competition_submissions_user_idx ON public.competition_submissions (competition_id, user_id);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_submissions ENABLE ROW LEVEL SECURITY;

-- Is registration open right now? Used by the insert policy.
CREATE OR REPLACE FUNCTION public.competition_registration_open(p_competition_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = p_competition_id
      AND c.status IN ('upcoming', 'open')
      AND (c.registration_opens_at IS NULL OR c.registration_opens_at <= now())
      AND (c.registration_closes_at IS NULL OR c.registration_closes_at > now())
  );
$$;

-- May this user submit right now? Registered, competition open, before the deadline.
CREATE OR REPLACE FUNCTION public.competition_can_submit(p_competition_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competitions c
    JOIN public.competition_registrations r ON r.competition_id = c.id AND r.user_id = p_user_id AND r.status = 'registered'
    WHERE c.id = p_competition_id
      AND c.status = 'open'
      AND (c.starts_at IS NULL OR c.starts_at <= now())
      AND (c.submission_deadline IS NULL OR c.submission_deadline > now())
  );
$$;

DROP POLICY IF EXISTS "Announced competitions are public" ON public.competitions;
CREATE POLICY "Announced competitions are public" ON public.competitions
  FOR SELECT USING (status <> 'draft' OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage competitions" ON public.competitions;
CREATE POLICY "Admins manage competitions" ON public.competitions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Participants read own registration" ON public.competition_registrations;
CREATE POLICY "Participants read own registration" ON public.competition_registrations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Participants register while open" ON public.competition_registrations;
CREATE POLICY "Participants register while open" ON public.competition_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'registered' AND public.competition_registration_open(competition_id));
DROP POLICY IF EXISTS "Participants withdraw" ON public.competition_registrations;
CREATE POLICY "Participants withdraw" ON public.competition_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status <> 'disqualified')
  WITH CHECK (user_id = auth.uid() AND (status = 'withdrawn' OR (status = 'registered' AND public.competition_registration_open(competition_id))));
DROP POLICY IF EXISTS "Admins manage registrations" ON public.competition_registrations;
CREATE POLICY "Admins manage registrations" ON public.competition_registrations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Participants read own submissions" ON public.competition_submissions;
CREATE POLICY "Participants read own submissions" ON public.competition_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Participants submit while open" ON public.competition_submissions;
CREATE POLICY "Participants submit while open" ON public.competition_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.competition_can_submit(competition_id, auth.uid()));
DROP POLICY IF EXISTS "Admins judge submissions" ON public.competition_submissions;
CREATE POLICY "Admins judge submissions" ON public.competition_submissions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Participants cannot write judging fields; a new submission always starts unscored.
CREATE OR REPLACE FUNCTION public.protect_competition_judging()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_context() THEN
    RETURN NEW;
  END IF;
  NEW.status := 'submitted';
  NEW.score := NULL;
  NEW.judge_feedback := NULL;
  NEW.scored_by := NULL;
  NEW.scored_at := NULL;
  NEW.submitted_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_competition_judging ON public.competition_submissions;
CREATE TRIGGER protect_competition_judging
  BEFORE INSERT OR UPDATE ON public.competition_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_competition_judging();

-- Leaderboard: only after results are published, best score per person,
-- display name shortened to first name and initial.
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
RETURNS TABLE (rank bigint, display_name text, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH best AS (
    SELECT s.user_id, max(s.score) AS score
    FROM public.competition_submissions s
    JOIN public.competitions c ON c.id = s.competition_id
    WHERE s.competition_id = p_competition_id
      AND s.status = 'scored' AND s.score IS NOT NULL
      AND c.results_published_at IS NOT NULL AND c.results_published_at <= now()
    GROUP BY s.user_id
  )
  SELECT rank() OVER (ORDER BY b.score DESC),
         coalesce(split_part(btrim(p.full_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(btrim(p.full_name), ' ', 2), ''), 1) || '.', ''), 'Participant'),
         b.score
  FROM best b JOIN public.profiles p ON p.id = b.user_id
  ORDER BY b.score DESC
  LIMIT 100;
$$;

GRANT SELECT ON public.competitions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.competition_registrations, public.competition_submissions TO authenticated;
GRANT DELETE ON public.competitions, public.competition_registrations, public.competition_submissions TO authenticated;
GRANT INSERT, UPDATE ON public.competitions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.competition_registration_open(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.competition_can_submit(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Learner preferences (onboarding) and research consent
--    Raw answers are readable by their owner only. Instructors cannot
--    read them. Admins see aggregates of consenting learners, with
--    small groups suppressed.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_goal text CHECK (learning_goal IN ('start_career', 'change_career', 'grow_in_role', 'team_project', 'personal_interest', 'other')),
  experience_level text CHECK (experience_level IN ('new', 'some', 'experienced')),
  interests text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  career_goal text CHECK (career_goal IS NULL OR length(career_goal) <= 200),
  preferred_mode text CHECK (preferred_mode IN ('self_paced', 'cohort', 'either')),
  weekly_hours text CHECK (weekly_hours IN ('lt3', '3to5', '6to10', 'gt10')),
  access_route text NOT NULL DEFAULT 'individual' CHECK (access_route IN ('individual', 'organisation')),
  sponsor_organisation text CHECK (sponsor_organisation IS NULL OR length(sponsor_organisation) <= 160),
  research_consent boolean NOT NULL DEFAULT false,
  research_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners manage their own preferences" ON public.learner_preferences;
CREATE POLICY "Learners manage their own preferences" ON public.learner_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.learner_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_learner_preferences()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.research_consent AND (TG_OP = 'INSERT' OR NOT OLD.research_consent) THEN
    NEW.research_consent_at := now();
  ELSIF NOT NEW.research_consent THEN
    NEW.research_consent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_learner_preferences ON public.learner_preferences;
CREATE TRIGGER stamp_learner_preferences
  BEFORE INSERT OR UPDATE ON public.learner_preferences
  FOR EACH ROW EXECUTE FUNCTION public.stamp_learner_preferences();

-- Aggregate onboarding answers for programme planning. Admins only;
-- consenting learners only; any answer given by fewer than 5 learners
-- is folded into "suppressed".
CREATE OR REPLACE FUNCTION public.get_onboarding_insights()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min constant integer := 5;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can read onboarding insights' USING ERRCODE = '42501';
  END IF;

  WITH consenting AS (
    SELECT * FROM public.learner_preferences WHERE research_consent
  ),
  answers AS (
    SELECT 'goal' AS question, learning_goal AS answer FROM consenting WHERE learning_goal IS NOT NULL
    UNION ALL SELECT 'level', experience_level FROM consenting WHERE experience_level IS NOT NULL
    UNION ALL SELECT 'mode', preferred_mode FROM consenting WHERE preferred_mode IS NOT NULL
    UNION ALL SELECT 'hours', weekly_hours FROM consenting WHERE weekly_hours IS NOT NULL
    UNION ALL SELECT 'access', access_route FROM consenting
    UNION ALL SELECT 'interest', unnest(interests) FROM consenting
    UNION ALL SELECT 'tool', unnest(tools) FROM consenting
  ),
  counted AS (
    SELECT question, answer, count(*)::integer AS n FROM answers GROUP BY question, answer
  ),
  grouped AS (
    SELECT question,
      coalesce(jsonb_object_agg(answer, n) FILTER (WHERE n >= v_min), '{}'::jsonb) AS shown,
      coalesce(sum(n) FILTER (WHERE n < v_min), 0)::integer AS suppressed
    FROM counted GROUP BY question
  )
  SELECT jsonb_build_object(
    'minimum_group_size', v_min,
    'learners_with_answers', (SELECT count(*) FROM public.learner_preferences),
    'consenting_learners', (SELECT count(*) FROM consenting),
    'questions', coalesce((SELECT jsonb_object_agg(question, jsonb_build_object('counts', shown, 'suppressed', suppressed)) FROM grouped), '{}'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_onboarding_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_insights() TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Rubrics, required written feedback, grade history
-- ---------------------------------------------------------------------
-- A rubric: {"criteria":[{"id":"c1","title":"…","description":"…",
--   "levels":[{"label":"Excellent","points":10,"description":"…"}]}]}
CREATE OR REPLACE FUNCTION public.is_valid_rubric(p_rubric jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_criterion jsonb;
  v_level jsonb;
BEGIN
  IF p_rubric IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(p_rubric) <> 'object' OR jsonb_typeof(p_rubric -> 'criteria') <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p_rubric -> 'criteria') NOT BETWEEN 1 AND 20 THEN RETURN false; END IF;
  FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_rubric -> 'criteria') LOOP
    IF jsonb_typeof(v_criterion -> 'id') <> 'string' OR jsonb_typeof(v_criterion -> 'title') <> 'string'
       OR length(btrim(v_criterion ->> 'title')) = 0 OR jsonb_typeof(v_criterion -> 'levels') <> 'array'
       OR jsonb_array_length(v_criterion -> 'levels') NOT BETWEEN 1 AND 8 THEN
      RETURN false;
    END IF;
    FOR v_level IN SELECT * FROM jsonb_array_elements(v_criterion -> 'levels') LOOP
      IF jsonb_typeof(v_level -> 'label') <> 'string' OR jsonb_typeof(v_level -> 'points') <> 'number'
         OR (v_level ->> 'points')::numeric < 0 THEN
        RETURN false;
      END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS rubric jsonb;
ALTER TABLE public.capstone_projects ADD COLUMN IF NOT EXISTS rubric jsonb;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS rubric_scores jsonb;
ALTER TABLE public.capstone_submissions ADD COLUMN IF NOT EXISTS rubric_scores jsonb;

DO $$ BEGIN
  ALTER TABLE public.course_lessons ADD CONSTRAINT course_lessons_rubric_valid CHECK (public.is_valid_rubric(rubric));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.capstone_projects ADD CONSTRAINT capstone_projects_rubric_valid CHECK (public.is_valid_rubric(rubric));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rubric scores are grading data: course staff and admins only.
-- Fires after protect_submission_grade (triggers run in name order).
CREATE OR REPLACE FUNCTION public.protect_submission_rubric_scores()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  IF public.is_privileged_context() THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'capstone_submissions' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.capstone_projects cp JOIN public.courses c ON c.id = cp.course_id
      WHERE cp.id = NEW.capstone_project_id AND c.teacher_id = auth.uid()
    ) INTO v_is_staff;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_chapters ch ON ch.id = l.chapter_id
      JOIN public.courses c ON c.id = ch.course_id
      WHERE l.id = NEW.lesson_id AND c.teacher_id = auth.uid()
    ) INTO v_is_staff;
  END IF;
  IF NOT v_is_staff THEN
    NEW.rubric_scores := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.rubric_scores END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_rubric_scores ON public.assignment_submissions;
CREATE TRIGGER protect_submission_rubric_scores
  BEFORE INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_rubric_scores();
DROP TRIGGER IF EXISTS protect_submission_rubric_scores ON public.capstone_submissions;
CREATE TRIGGER protect_submission_rubric_scores
  BEFORE INSERT OR UPDATE ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_rubric_scores();

-- A mark is never published without a written comment (20+ characters).
-- Only checked when the mark or comment changes, so existing rows stay valid.
CREATE OR REPLACE FUNCTION public.require_grade_feedback()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grade IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.feedback IS DISTINCT FROM OLD.feedback)
     AND length(btrim(coalesce(NEW.feedback, ''))) < 20 THEN
    RAISE EXCEPTION 'A mark must be published with written feedback of at least 20 characters'
      USING ERRCODE = '23514', HINT = 'feedback_required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_grade_feedback ON public.assignment_submissions;
CREATE TRIGGER require_grade_feedback
  BEFORE INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.require_grade_feedback();
DROP TRIGGER IF EXISTS require_grade_feedback ON public.capstone_submissions;
CREATE TRIGGER require_grade_feedback
  BEFORE INSERT OR UPDATE ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.require_grade_feedback();

-- Every published mark is kept, so a change never silently replaces history.
CREATE TABLE IF NOT EXISTS public.grade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type text NOT NULL CHECK (submission_type IN ('assignment', 'capstone')),
  submission_id uuid NOT NULL,
  student_id uuid NOT NULL,
  grade numeric,
  feedback text,
  rubric_scores jsonb,
  graded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grade_history_submission_idx ON public.grade_history (submission_type, submission_id, recorded_at);

ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners read their own grade history" ON public.grade_history;
CREATE POLICY "Learners read their own grade history" ON public.grade_history
  FOR SELECT TO authenticated USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Course staff read grade history" ON public.grade_history;
CREATE POLICY "Course staff read grade history" ON public.grade_history
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR (submission_type = 'assignment' AND EXISTS (
      SELECT 1 FROM public.assignment_submissions s
      JOIN public.course_lessons l ON l.id = s.lesson_id
      JOIN public.course_chapters ch ON ch.id = l.chapter_id
      JOIN public.courses c ON c.id = ch.course_id
      WHERE s.id = submission_id AND c.teacher_id = auth.uid()))
    OR (submission_type = 'capstone' AND EXISTS (
      SELECT 1 FROM public.capstone_submissions s
      JOIN public.capstone_projects cp ON cp.id = s.capstone_project_id
      JOIN public.courses c ON c.id = cp.course_id
      WHERE s.id = submission_id AND c.teacher_id = auth.uid()))
  );
-- No insert, update or delete policies: rows are written by the trigger only.
REVOKE ALL ON public.grade_history FROM anon, authenticated;
GRANT SELECT ON public.grade_history TO authenticated;

CREATE OR REPLACE FUNCTION public.record_grade_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.grade IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.grade IS NOT DISTINCT FROM OLD.grade
     AND NEW.feedback IS NOT DISTINCT FROM OLD.feedback
     AND NEW.rubric_scores IS NOT DISTINCT FROM OLD.rubric_scores THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.grade_history (submission_type, submission_id, student_id, grade, feedback, rubric_scores, graded_by)
  VALUES (
    CASE WHEN TG_TABLE_NAME = 'capstone_submissions' THEN 'capstone' ELSE 'assignment' END,
    NEW.id, NEW.student_id, NEW.grade, NEW.feedback, NEW.rubric_scores, auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_grade_history ON public.assignment_submissions;
CREATE TRIGGER record_grade_history
  AFTER INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.record_grade_history();
DROP TRIGGER IF EXISTS record_grade_history ON public.capstone_submissions;
CREATE TRIGGER record_grade_history
  AFTER INSERT OR UPDATE ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.record_grade_history();
