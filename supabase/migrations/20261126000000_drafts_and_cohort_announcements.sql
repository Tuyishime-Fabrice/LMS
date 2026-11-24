-- =====================================================================
-- Cohort announcements and facilitator assignment drafts (2026-11-26)
--
-- Additive and idempotent. Apply by hand after
-- 20261125000000_facilitators.sql, with a backup.
--
--  1. Announcements can target one cohort (teacher_announcements.cohort_id).
--     Only that cohort's learners read it and are notified. Cohort
--     facilitators may post to their cohort. Posting and editing share one
--     rule, so an author can no longer move an announcement to a course or
--     cohort they could not post to (previously the update policy checked
--     authorship only).
--  2. Facilitators draft assignments (title, instructions, module, due date,
--     rubric) and submit them; the course instructor or an admin approves,
--     which creates the assignment lesson, or returns them with a note.
--     Facilitators never write course_lessons themselves.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cohort announcements
-- ---------------------------------------------------------------------
ALTER TABLE public.teacher_announcements
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.cohorts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_teacher_announcements_cohort ON public.teacher_announcements (cohort_id);

-- Is this learner in this cohort? cohort_id where recorded, else cohort_name.
CREATE OR REPLACE FUNCTION public.learner_in_cohort(p_cohort_id uuid, p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments e JOIN public.cohorts co ON co.id = p_cohort_id
    WHERE e.course_id = co.course_id AND e.student_id = p_student_id
      AND (e.cohort_id = p_cohort_id OR (e.cohort_id IS NULL AND e.cohort_name = co.name))
  );
$$;

-- Facilitates this cohort (assigned to it, or to the whole course).
CREATE OR REPLACE FUNCTION public.facilitates_cohort(p_course_id uuid, p_cohort_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_staff s
    WHERE s.user_id = p_user_id AND s.course_id = p_course_id AND (s.cohort_id IS NULL OR s.cohort_id = p_cohort_id)
  );
$$;

-- May the caller post (or keep) an announcement with this target?
CREATE OR REPLACE FUNCTION public.can_post_announcement(p_course_id uuid, p_cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_cohort_id IS NOT NULL THEN
      p_course_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.cohorts co WHERE co.id = p_cohort_id AND co.course_id = p_course_id)
      AND (
        public.is_admin(auth.uid())
        OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.teacher_id = auth.uid())
        OR public.facilitates_cohort(p_course_id, p_cohort_id)
      )
    WHEN p_course_id IS NOT NULL THEN
      public.is_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.teacher_id = auth.uid())
      OR public.is_course_wide_facilitator(p_course_id)
    -- No course: reaches only learners of courses the author teaches (read policy below).
    ELSE true
  END;
$$;
GRANT EXECUTE ON FUNCTION public.can_post_announcement(uuid, uuid), public.learner_in_cohort(uuid, uuid),
  public.facilitates_cohort(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Teachers can create announcements" ON public.teacher_announcements;
CREATE POLICY "Teachers can create announcements" ON public.teacher_announcements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.can_post_announcement(course_id, cohort_id));

DROP POLICY IF EXISTS "Teachers can update their announcements" ON public.teacher_announcements;
CREATE POLICY "Teachers can update their announcements" ON public.teacher_announcements
  FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id AND public.can_post_announcement(course_id, cohort_id));

-- Read: the author; the course instructor and admins; facilitators within
-- their scope; and learners: course-wide ones of their courses, cohort ones
-- of their own cohort only.
DROP POLICY IF EXISTS "Teachers can view their announcements" ON public.teacher_announcements;
CREATE POLICY "Teachers can view their announcements" ON public.teacher_announcements
  FOR SELECT TO authenticated USING (
    auth.uid() = teacher_id
    OR public.is_admin(auth.uid())
    OR (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()))
    OR (course_id IS NOT NULL AND cohort_id IS NULL AND public.is_course_facilitator(course_id))
    OR (cohort_id IS NOT NULL AND public.facilitates_cohort(course_id, cohort_id))
    OR (
      is_active = true AND (
        (course_id IS NULL AND EXISTS (
          SELECT 1 FROM public.course_enrollments ce JOIN public.courses c ON ce.course_id = c.id
          WHERE ce.student_id = auth.uid() AND c.teacher_id = teacher_announcements.teacher_id))
        OR (course_id IS NOT NULL AND cohort_id IS NULL AND course_id IN (
          SELECT ce.course_id FROM public.course_enrollments ce WHERE ce.student_id = auth.uid()))
        OR (cohort_id IS NOT NULL AND public.learner_in_cohort(cohort_id, auth.uid()))
      )
    )
  );

-- Notify the audience that can read it: a cohort announcement reaches its cohort only.
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
    WHERE ((NEW.course_id IS NOT NULL AND e.course_id = NEW.course_id)
           OR (NEW.course_id IS NULL AND c.teacher_id = NEW.teacher_id))
      AND (NEW.cohort_id IS NULL OR public.learner_in_cohort(NEW.cohort_id, e.student_id))
  LOOP
    PERFORM public.notify_user(
      s.student_id, 'announcement', NEW.title, left(NEW.message, 240),
      '/student/dashboard',
      jsonb_build_object('course_id', NEW.course_id, 'cohort_id', NEW.cohort_id, 'announcement_id', NEW.id), false);
  END LOOP;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. Assignment drafts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignment_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  instructions text CHECK (instructions IS NULL OR length(instructions) <= 8000),
  due_date timestamptz,
  rubric jsonb CHECK (public.is_valid_rubric(rubric)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved')),
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignment_drafts_course_idx ON public.assignment_drafts (course_id, status);

-- Authors move only draft ↔ submitted, and only while not yet decided.
-- Review fields, the created lesson and the course are set by the
-- instructor's functions below, never by the author.
CREATE OR REPLACE FUNCTION public.guard_assignment_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.course_chapters WHERE id = NEW.chapter_id AND course_id = NEW.course_id) THEN
    RAISE EXCEPTION 'The module does not belong to this course' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  v_reviewer := public.is_privileged_context()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = NEW.course_id AND c.teacher_id = auth.uid());
  IF v_reviewer THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.author_id := auth.uid();
    NEW.review_note := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.lesson_id := NULL;
  ELSE
    IF OLD.status NOT IN ('draft', 'changes_requested') THEN
      RAISE EXCEPTION 'This draft is with the instructor or already approved' USING ERRCODE = '42501';
    END IF;
    NEW.author_id := OLD.author_id; NEW.course_id := OLD.course_id;
    NEW.review_note := OLD.review_note; NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
    NEW.lesson_id := OLD.lesson_id;
  END IF;
  IF NEW.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Only the instructor can approve or return a draft' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status <> 'submitted') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_assignment_draft ON public.assignment_drafts;
CREATE TRIGGER guard_assignment_draft
  BEFORE INSERT OR UPDATE ON public.assignment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_draft();

-- Tell the instructor when a draft arrives.
CREATE OR REPLACE FUNCTION public.notify_on_draft_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher uuid;
BEGIN
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted') THEN
    SELECT teacher_id INTO v_teacher FROM public.courses WHERE id = NEW.course_id;
    IF v_teacher IS NOT NULL THEN
      PERFORM public.notify_user(v_teacher, 'assignment_draft_submitted', NEW.title,
        'A facilitator submitted an assignment draft for your approval.', '/teacher/assignments',
        jsonb_build_object('course_id', NEW.course_id, 'draft_id', NEW.id), false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_on_draft_submitted ON public.assignment_drafts;
CREATE TRIGGER notify_on_draft_submitted
  AFTER INSERT OR UPDATE OF status ON public.assignment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_draft_submitted();

ALTER TABLE public.assignment_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors and course staff read drafts" ON public.assignment_drafts;
CREATE POLICY "Authors and course staff read drafts" ON public.assignment_drafts
  FOR SELECT TO authenticated USING (
    (author_id = auth.uid() AND public.is_course_facilitator(course_id))
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "Facilitators create drafts" ON public.assignment_drafts;
CREATE POLICY "Facilitators create drafts" ON public.assignment_drafts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_course_facilitator(course_id));
DROP POLICY IF EXISTS "Facilitators edit their drafts" ON public.assignment_drafts;
CREATE POLICY "Facilitators edit their drafts" ON public.assignment_drafts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_course_facilitator(course_id))
  WITH CHECK (author_id = auth.uid() AND public.is_course_facilitator(course_id));
DROP POLICY IF EXISTS "Facilitators delete undecided drafts" ON public.assignment_drafts;
CREATE POLICY "Facilitators delete undecided drafts" ON public.assignment_drafts
  FOR DELETE TO authenticated USING (author_id = auth.uid() AND status <> 'approved');
REVOKE ALL ON public.assignment_drafts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_drafts TO authenticated;

-- Approve: create the assignment lesson at the end of the chosen module.
CREATE OR REPLACE FUNCTION public.approve_assignment_draft(p_draft_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_draft public.assignment_drafts%ROWTYPE;
  v_lesson uuid;
BEGIN
  SELECT * INTO v_draft FROM public.assignment_drafts WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = v_draft.course_id AND c.teacher_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the course instructor or an administrator can approve' USING ERRCODE = '42501';
  END IF;
  IF v_draft.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted drafts can be approved' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.course_lessons (chapter_id, title, description, content_type, content_url, order_index, due_date, rubric)
  VALUES (
    v_draft.chapter_id, v_draft.title, v_draft.instructions, 'assignment', '',
    coalesce((SELECT max(order_index) + 1 FROM public.course_lessons WHERE chapter_id = v_draft.chapter_id), 0),
    v_draft.due_date, v_draft.rubric
  ) RETURNING id INTO v_lesson;

  UPDATE public.assignment_drafts
     SET status = 'approved', lesson_id = v_lesson, reviewed_by = auth.uid(), reviewed_at = now(), review_note = NULL
   WHERE id = p_draft_id;

  PERFORM public.notify_user(v_draft.author_id, 'assignment_draft_approved', v_draft.title,
    'Your assignment draft was approved and is now part of the course.', '/facilitate/assignments',
    jsonb_build_object('course_id', v_draft.course_id, 'draft_id', v_draft.id, 'lesson_id', v_lesson), false);
  RETURN v_lesson;
END;
$$;

-- Return with a note: the author can edit and submit again.
CREATE OR REPLACE FUNCTION public.return_assignment_draft(p_draft_id uuid, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_draft public.assignment_drafts%ROWTYPE;
BEGIN
  SELECT * INTO v_draft FROM public.assignment_drafts WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = v_draft.course_id AND c.teacher_id = auth.uid())) THEN
    RAISE EXCEPTION 'Only the course instructor or an administrator can return a draft' USING ERRCODE = '42501';
  END IF;
  IF v_draft.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted drafts can be returned' USING ERRCODE = '23514';
  END IF;
  IF length(btrim(coalesce(p_note, ''))) < 10 THEN
    RAISE EXCEPTION 'Say what needs to change (at least 10 characters)' USING ERRCODE = '23514';
  END IF;

  UPDATE public.assignment_drafts
     SET status = 'changes_requested', review_note = btrim(p_note), reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_draft_id;

  PERFORM public.notify_user(v_draft.author_id, 'assignment_draft_returned', v_draft.title,
    left(btrim(p_note), 240), '/facilitate/assignments',
    jsonb_build_object('course_id', v_draft.course_id, 'draft_id', v_draft.id), false);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_assignment_draft(uuid), public.return_assignment_draft(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_assignment_draft(uuid), public.return_assignment_draft(uuid, text) TO authenticated;
