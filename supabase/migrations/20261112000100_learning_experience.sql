-- =====================================================================
-- Learning experience (redesign stage 0.5 / 3)
--
-- Additive and idempotent. Adds:
--  1. Resume point and maintained progress on enrolments
--  2. Session details for the calendar (end time, format, location)
--  3. Course overview fields and assignment deadlines
--  4. Notifications, with an email outbox for application and
--     submission events only
--  5. Automatic certificates: issued when a capstone is graded at or
--     above the course threshold (65 by default), with a unique number,
--     a verification code and a public verification function
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Resume point and progress
-- ---------------------------------------------------------------------
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;

-- Link enrolments to their cohort where the stored cohort name matches
-- exactly one cohort of the same course.
UPDATE public.course_enrollments e
SET cohort_id = c.id
FROM public.cohorts c
WHERE e.cohort_id IS NULL
  AND e.cohort_name IS NOT NULL
  AND c.course_id = e.course_id
  AND c.name = e.cohort_name
  AND (SELECT count(*) FROM public.cohorts c2
       WHERE c2.course_id = e.course_id AND c2.name = e.cohort_name) = 1;

CREATE OR REPLACE FUNCTION public.refresh_enrollment_progress(p_student_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_done integer;
BEGIN
  SELECT count(l.id),
         count(l.id) FILTER (WHERE p.is_completed)
    INTO v_total, v_done
  FROM public.course_chapters ch
  JOIN public.course_lessons l ON l.chapter_id = ch.id
  LEFT JOIN public.student_lesson_progress p
    ON p.lesson_id = l.id AND p.student_id = p_student_id
  WHERE ch.course_id = p_course_id;

  UPDATE public.course_enrollments
  SET progress_percentage = CASE WHEN v_total > 0 THEN round(v_done * 100.0 / v_total)::integer ELSE 0 END
  WHERE student_id = p_student_id AND course_id = p_course_id;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_enrollment_progress(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_lesson_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
BEGIN
  SELECT ch.course_id INTO v_course
  FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NOT NULL THEN
    PERFORM public.refresh_enrollment_progress(NEW.student_id, v_course);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lesson_progress_change ON public.student_lesson_progress;
CREATE TRIGGER on_lesson_progress_change
  AFTER INSERT OR UPDATE OF is_completed ON public.student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.on_lesson_progress_change();

-- Called when a learner opens a lesson. Never changes completion.
CREATE OR REPLACE FUNCTION public.record_lesson_visit(p_lesson_id uuid, p_position integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_course uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  SELECT ch.course_id INTO v_course
  FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id
  WHERE l.id = p_lesson_id;
  IF v_course IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.course_enrollments WHERE student_id = v_user AND course_id = v_course
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.student_lesson_progress (student_id, lesson_id, is_completed, last_position)
  VALUES (v_user, p_lesson_id, false, coalesce(p_position, 0))
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET last_position = coalesce(p_position, public.student_lesson_progress.last_position);

  UPDATE public.course_enrollments
  SET last_lesson_id = p_lesson_id, last_activity_at = now()
  WHERE student_id = v_user AND course_id = v_course;
END;
$$;
REVOKE ALL ON FUNCTION public.record_lesson_visit(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lesson_visit(uuid, integer) TO authenticated;

-- Bring the stored percentage up to date for existing enrolments.
DO $$
DECLARE e record;
BEGIN
  FOR e IN SELECT student_id, course_id FROM public.course_enrollments LOOP
    PERFORM public.refresh_enrollment_progress(e.student_id, e.course_id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Sessions
-- ---------------------------------------------------------------------
ALTER TABLE public.scheduled_classes
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS modality text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

ALTER TABLE public.scheduled_classes ALTER COLUMN meet_link DROP NOT NULL;

ALTER TABLE public.scheduled_classes DROP CONSTRAINT IF EXISTS scheduled_classes_modality_check;
ALTER TABLE public.scheduled_classes ADD CONSTRAINT scheduled_classes_modality_check
  CHECK (modality IN ('online', 'in_person', 'hybrid'));
ALTER TABLE public.scheduled_classes DROP CONSTRAINT IF EXISTS scheduled_classes_status_check;
ALTER TABLE public.scheduled_classes ADD CONSTRAINT scheduled_classes_status_check
  CHECK (status IN ('scheduled', 'cancelled'));

-- The interface has always shown one hour; store that explicitly.
UPDATE public.scheduled_classes
SET end_time = scheduled_time + interval '1 hour'
WHERE end_time IS NULL;

DROP POLICY IF EXISTS "Admins can manage scheduled classes" ON public.scheduled_classes;
CREATE POLICY "Admins can manage scheduled classes"
  ON public.scheduled_classes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------------------------------------------------------------------
-- 3. Course overview fields and assignment deadlines
-- ---------------------------------------------------------------------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS learning_outcomes text[];

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS learning_objectives text[];

-- ---------------------------------------------------------------------
-- 4. Notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  -- NULL = in-app only. 'pending' rows are picked up by the email sender.
  email_status text CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending ON public.notifications(created_at) WHERE email_status = 'pending';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their notifications" ON public.notifications;
CREATE POLICY "Users can read their notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;
CREATE POLICY "Users can delete their notifications"
  ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_types text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage their notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL,
  p_link text DEFAULT NULL, p_data jsonb DEFAULT '{}'::jsonb, p_email boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  -- A muted type is skipped in-app. Email for applications and
  -- submissions is transactional and is still queued.
  IF NOT p_email AND EXISTS (
    SELECT 1 FROM public.notification_preferences np
    WHERE np.user_id = p_user_id AND p_type = ANY (np.muted_types)
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, data, email_status)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'::jsonb),
          CASE WHEN p_email THEN 'pending' END);
END;
$$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL
    AND (p_ids IS NULL OR id = ANY (p_ids));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

-- 4a. Submissions: receipt to the learner (email), alert to the teacher,
--     and the result to the learner when it is graded (email).
CREATE OR REPLACE FUNCTION public.notify_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_course_title text;
  v_teacher uuid;
  v_item text;
  v_kind text;
BEGIN
  IF TG_TABLE_NAME = 'capstone_submissions' THEN
    SELECT c.id, c.title, c.teacher_id, cp.title INTO v_course, v_course_title, v_teacher, v_item
    FROM public.capstone_projects cp JOIN public.courses c ON c.id = cp.course_id
    WHERE cp.id = NEW.capstone_project_id;
    v_kind := 'capstone';
  ELSE
    SELECT c.id, c.title, c.teacher_id, l.title INTO v_course, v_course_title, v_teacher, v_item
    FROM public.course_lessons l
    JOIN public.course_chapters ch ON ch.id = l.chapter_id
    JOIN public.courses c ON c.id = ch.course_id
    WHERE l.id = NEW.lesson_id;
    v_kind := 'assignment';
  END IF;

  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
    PERFORM public.notify_user(
      NEW.student_id, 'submission_received',
      'Submission received: ' || coalesce(v_item, 'your work'),
      'Your ' || v_kind || ' for ' || coalesce(v_course_title, 'your course') || ' was submitted.',
      '/student/assignments',
      jsonb_build_object('course_id', v_course, 'kind', v_kind, 'submission_id', NEW.id), true);
    PERFORM public.notify_user(
      v_teacher, 'new_submission',
      'New ' || v_kind || ' submission',
      coalesce(v_item, 'A submission') || ' in ' || coalesce(v_course_title, 'your course') || ' is ready to review.',
      '/teacher/assignments',
      jsonb_build_object('course_id', v_course, 'kind', v_kind, 'submission_id', NEW.id), false);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL AND NEW.grade IS DISTINCT FROM OLD.grade THEN
    PERFORM public.notify_user(
      NEW.student_id, 'submission_graded',
      'Graded: ' || coalesce(v_item, 'your work'),
      'You received ' || NEW.grade || '/100 for your ' || v_kind || ' in ' || coalesce(v_course_title, 'your course') || '.',
      '/student/scores',
      jsonb_build_object('course_id', v_course, 'kind', v_kind, 'submission_id', NEW.id, 'grade', NEW.grade), true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_submission ON public.assignment_submissions;
CREATE TRIGGER notify_on_submission
  AFTER INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_submission();
DROP TRIGGER IF EXISTS notify_on_submission ON public.capstone_submissions;
CREATE TRIGGER notify_on_submission
  AFTER INSERT OR UPDATE ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_submission();

-- 4b. Applications (scholarships and cohort requests): receipt and decision.
CREATE OR REPLACE FUNCTION public.notify_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_kind text;
BEGIN
  IF TG_TABLE_NAME = 'scholarship_applications' THEN
    SELECT c.title INTO v_label FROM public.courses c WHERE c.id = NEW.course_id;
    v_kind := 'scholarship';
  ELSE
    SELECT co.name INTO v_label FROM public.cohorts co WHERE co.id = NEW.cohort_id;
    v_kind := 'cohort';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_user(
      NEW.student_id, 'application_received',
      CASE v_kind WHEN 'scholarship' THEN 'Scholarship application received'
                  ELSE 'Cohort request received' END,
      'We received your application for ' || coalesce(v_label, 'the programme') || '. You will be notified when it is reviewed.',
      '/student/dashboard',
      jsonb_build_object('kind', v_kind, 'application_id', NEW.id), true);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM public.notify_user(
      NEW.student_id, 'application_decision',
      CASE WHEN NEW.status = 'approved' THEN 'Application approved' ELSE 'Application not approved' END,
      'Your ' || v_kind || ' application for ' || coalesce(v_label, 'the programme') || ' was ' ||
        CASE WHEN NEW.status = 'approved' THEN 'approved.' ELSE 'not approved this time.' END,
      '/student/dashboard',
      jsonb_build_object('kind', v_kind, 'application_id', NEW.id, 'status', NEW.status), true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_application ON public.scholarship_applications;
CREATE TRIGGER notify_on_application
  AFTER INSERT OR UPDATE ON public.scholarship_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application();
DROP TRIGGER IF EXISTS notify_on_application ON public.cohort_join_requests;
CREATE TRIGGER notify_on_application
  AFTER INSERT OR UPDATE ON public.cohort_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application();

-- 4c. Sessions and course announcements: in-app only, to enrolled learners.
CREATE OR REPLACE FUNCTION public.notify_on_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_type text;
  s record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'session_scheduled'; v_title := 'New session: ' || NEW.title;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    v_type := 'session_cancelled'; v_title := 'Session cancelled: ' || NEW.title;
  ELSIF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.modality IS DISTINCT FROM OLD.modality THEN
    v_type := 'session_changed'; v_title := 'Session updated: ' || NEW.title;
  ELSE
    RETURN NEW;
  END IF;

  FOR s IN
    SELECT e.student_id FROM public.course_enrollments e
    WHERE e.course_id = NEW.course_id
      AND (NEW.cohort_id IS NULL OR e.cohort_id IS NULL OR e.cohort_id = NEW.cohort_id)
  LOOP
    PERFORM public.notify_user(
      s.student_id, v_type, v_title,
      to_char(NEW.scheduled_time AT TIME ZONE 'Africa/Kigali', 'Dy DD Mon, HH24:MI') || ' (Kigali time)',
      '/student/schedule',
      jsonb_build_object('course_id', NEW.course_id, 'session_id', NEW.id), false);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_session_change ON public.scheduled_classes;
CREATE TRIGGER notify_on_session_change
  AFTER INSERT OR UPDATE ON public.scheduled_classes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_session_change();

CREATE OR REPLACE FUNCTION public.notify_on_teacher_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s record;
BEGIN
  IF NOT coalesce(NEW.is_active, true) THEN
    RETURN NEW;
  END IF;
  FOR s IN
    SELECT DISTINCT e.student_id
    FROM public.course_enrollments e JOIN public.courses c ON c.id = e.course_id
    WHERE (NEW.course_id IS NOT NULL AND e.course_id = NEW.course_id)
       OR (NEW.course_id IS NULL AND c.teacher_id = NEW.teacher_id)
  LOOP
    PERFORM public.notify_user(
      s.student_id, 'announcement', NEW.title, left(NEW.message, 240),
      '/student/dashboard',
      jsonb_build_object('course_id', NEW.course_id, 'announcement_id', NEW.id), false);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_teacher_announcement ON public.teacher_announcements;
CREATE TRIGGER notify_on_teacher_announcement
  AFTER INSERT ON public.teacher_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_teacher_announcement();

-- ---------------------------------------------------------------------
-- 5. Automatic certificates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_certificate_rules (
  course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
  auto_issue boolean NOT NULL DEFAULT true,
  min_capstone_grade integer NOT NULL DEFAULT 65 CHECK (min_capstone_grade BETWEEN 0 AND 100),
  require_all_lessons boolean NOT NULL DEFAULT false,
  signatory_name text,
  signatory_title text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.course_certificate_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read certificate rules" ON public.course_certificate_rules;
CREATE POLICY "Anyone signed in can read certificate rules"
  ON public.course_certificate_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Course staff manage certificate rules" ON public.course_certificate_rules;
CREATE POLICY "Course staff manage certificate rules"
  ON public.course_certificate_rules FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_number text,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS issue_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS capstone_grade integer,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revoked_reason text;

ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_status_check;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'revoked'));
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_issue_source_check;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_issue_source_check
  CHECK (issue_source IN ('manual', 'auto'));

CREATE UNIQUE INDEX IF NOT EXISTS certificates_number_key ON public.certificates(certificate_number);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_verification_code_key ON public.certificates(verification_code);

CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_certificate_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'DPA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.new_verification_code()
RETURNS text
LANGUAGE sql
AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
$$;
REVOKE ALL ON FUNCTION public.next_certificate_number() FROM PUBLIC, anon, authenticated;

-- Every issued certificate carries a number and a code, however it was created.
CREATE OR REPLACE FUNCTION public.certificates_assign_identifiers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF NEW.certificate_number IS NULL THEN
      NEW.certificate_number := public.next_certificate_number();
    END IF;
    IF NEW.verification_code IS NULL THEN
      NEW.verification_code := public.new_verification_code();
    END IF;
    IF NEW.issued_at IS NULL THEN
      NEW.issued_at := coalesce(NEW.approved_at, now());
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Identifiers never change once assigned.
    IF OLD.certificate_number IS NOT NULL THEN NEW.certificate_number := OLD.certificate_number; END IF;
    IF OLD.verification_code IS NOT NULL THEN NEW.verification_code := OLD.verification_code; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certificates_assign_identifiers ON public.certificates;
CREATE TRIGGER certificates_assign_identifiers
  BEFORE INSERT OR UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.certificates_assign_identifiers();

-- Existing approved certificates receive their identifiers now.
UPDATE public.certificates SET updated_at = updated_at
WHERE status = 'approved' AND (certificate_number IS NULL OR verification_code IS NULL);

CREATE OR REPLACE FUNCTION public.notify_on_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.courses WHERE id = NEW.course_id;
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.notify_user(
      NEW.student_id, 'certificate_issued', 'Your certificate is ready',
      'You earned the certificate for ' || coalesce(v_title, 'your course') || '.',
      '/student/certificates',
      jsonb_build_object('course_id', NEW.course_id, 'certificate_id', NEW.id), false);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'revoked' AND OLD.status IS DISTINCT FROM 'revoked' THEN
    PERFORM public.notify_user(
      NEW.student_id, 'certificate_revoked', 'A certificate was revoked',
      'The certificate for ' || coalesce(v_title, 'your course') || ' is no longer valid.',
      '/student/certificates',
      jsonb_build_object('course_id', NEW.course_id, 'certificate_id', NEW.id), false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_certificate ON public.certificates;
CREATE TRIGGER notify_on_certificate
  AFTER INSERT OR UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_certificate();

-- Issues the certificate when the course rule is met. Safe to call
-- repeatedly: one certificate per learner and course, and a revoked
-- certificate is never re-issued automatically.
CREATE OR REPLACE FUNCTION public.issue_certificate_if_eligible(p_student_id uuid, p_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.course_certificate_rules%ROWTYPE;
  v_min integer := 65;
  v_require_lessons boolean := false;
  v_auto boolean := true;
  v_grade integer;
  v_total integer;
  v_done integer;
  v_existing public.certificates%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_rule FROM public.course_certificate_rules WHERE course_id = p_course_id;
  IF FOUND THEN
    v_min := v_rule.min_capstone_grade;
    v_require_lessons := v_rule.require_all_lessons;
    v_auto := v_rule.auto_issue;
  END IF;
  IF NOT v_auto THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_enrollments WHERE student_id = p_student_id AND course_id = p_course_id
  ) THEN
    RETURN NULL;
  END IF;

  SELECT max(cs.grade) INTO v_grade
  FROM public.capstone_submissions cs
  JOIN public.capstone_projects cp ON cp.id = cs.capstone_project_id
  WHERE cp.course_id = p_course_id AND cs.student_id = p_student_id;
  IF v_grade IS NULL OR v_grade < v_min THEN
    RETURN NULL;
  END IF;

  IF v_require_lessons THEN
    SELECT count(l.id), count(l.id) FILTER (WHERE p.is_completed)
      INTO v_total, v_done
    FROM public.course_chapters ch
    JOIN public.course_lessons l ON l.chapter_id = ch.id
    LEFT JOIN public.student_lesson_progress p ON p.lesson_id = l.id AND p.student_id = p_student_id
    WHERE ch.course_id = p_course_id;
    IF v_total = 0 OR v_done < v_total THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.certificates
  WHERE student_id = p_student_id AND course_id = p_course_id;

  IF FOUND THEN
    IF v_existing.status IN ('approved', 'revoked', 'rejected') THEN
      RETURN v_existing.id;
    END IF;
    UPDATE public.certificates
    SET status = 'approved', approved_at = now(), issued_at = now(),
        issue_source = 'auto', capstone_grade = v_grade, grade = v_grade::text, updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.certificates
      (student_id, course_id, status, approved_at, issued_at, completion_date,
       issue_source, capstone_grade, grade)
    VALUES (p_student_id, p_course_id, 'approved', now(), now(), now(), 'auto', v_grade, v_grade::text)
    RETURNING id INTO v_id;
  END IF;

  UPDATE public.course_enrollments
  SET completed = true,
      completion_date = coalesce(completion_date, now()),
      final_grade = coalesce(final_grade, v_grade::text)
  WHERE student_id = p_student_id AND course_id = p_course_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_certificate_if_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_capstone_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course uuid;
BEGIN
  IF NEW.grade IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.grade IS NOT DISTINCT FROM OLD.grade THEN
    RETURN NEW;
  END IF;
  SELECT course_id INTO v_course FROM public.capstone_projects WHERE id = NEW.capstone_project_id;
  IF v_course IS NOT NULL THEN
    PERFORM public.issue_certificate_if_eligible(NEW.student_id, v_course);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_capstone_graded ON public.capstone_submissions;
CREATE TRIGGER on_capstone_graded
  AFTER INSERT OR UPDATE OF grade ON public.capstone_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_capstone_graded();

-- When a course also requires all lessons, finishing the last lesson
-- after the capstone was graded must issue the certificate too.
CREATE OR REPLACE FUNCTION public.on_lesson_completed_check_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course uuid;
BEGIN
  IF NOT coalesce(NEW.is_completed, false) THEN
    RETURN NEW;
  END IF;
  SELECT ch.course_id INTO v_course
  FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_certificate_rules r
    WHERE r.course_id = v_course AND r.require_all_lessons AND r.auto_issue
  ) THEN
    PERFORM public.issue_certificate_if_eligible(NEW.student_id, v_course);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lesson_completed_check_certificate ON public.student_lesson_progress;
CREATE TRIGGER on_lesson_completed_check_certificate
  AFTER INSERT OR UPDATE OF is_completed ON public.student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.on_lesson_completed_check_certificate();

-- Admin controls.
CREATE OR REPLACE FUNCTION public.revoke_certificate(p_certificate_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke certificates' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required to revoke a certificate';
  END IF;
  UPDATE public.certificates
  SET status = 'revoked', revoked_at = now(), revoked_by = auth.uid(),
      revoked_reason = p_reason, updated_at = now()
  WHERE id = p_certificate_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reinstate_certificate(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can reinstate certificates' USING ERRCODE = '42501';
  END IF;
  UPDATE public.certificates
  SET status = 'approved', revoked_at = NULL, revoked_by = NULL, revoked_reason = NULL, updated_at = now()
  WHERE id = p_certificate_id AND status = 'revoked';
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_certificate(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reinstate_certificate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_certificate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reinstate_certificate(uuid) TO authenticated;

-- Public verification by code. Returns the minimum needed to confirm a
-- certificate: holder name, course, dates and whether it is still valid.
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS TABLE (
  certificate_number text,
  holder_name text,
  course_title text,
  issued_at timestamptz,
  completion_date timestamptz,
  is_valid boolean,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.certificate_number,
         p.full_name::text,
         co.title::text,
         c.issued_at,
         c.completion_date,
         (c.status = 'approved'),
         c.status::text
  FROM public.certificates c
  JOIN public.profiles p ON p.id = c.student_id
  JOIN public.courses co ON co.id = c.course_id
  WHERE c.verification_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    AND c.status IN ('approved', 'revoked')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- Catch up for learners whose capstone already meets the rule. This is
-- NOT run by the migration: an admin runs it once, on purpose, from the
-- SQL editor or the admin certificates page:
--   SELECT public.issue_pending_certificates();
CREATE OR REPLACE FUNCTION public.issue_pending_certificates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_before integer;
  v_after integer;
BEGIN
  IF NOT public.is_privileged_context() THEN
    RAISE EXCEPTION 'Only admins can issue pending certificates' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO v_before FROM public.certificates WHERE status = 'approved';
  FOR r IN
    SELECT DISTINCT cs.student_id, cp.course_id
    FROM public.capstone_submissions cs
    JOIN public.capstone_projects cp ON cp.id = cs.capstone_project_id
    WHERE cs.grade IS NOT NULL
  LOOP
    PERFORM public.issue_certificate_if_eligible(r.student_id, r.course_id);
  END LOOP;
  SELECT count(*) INTO v_after FROM public.certificates WHERE status = 'approved';
  RETURN v_after - v_before;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_pending_certificates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_pending_certificates() TO authenticated;
