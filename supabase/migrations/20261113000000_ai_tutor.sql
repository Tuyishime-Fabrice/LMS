-- =====================================================================
-- AI Tutor
--
-- Additive and idempotent. One table holds every question a learner asks
-- the tutor and every answer it gives:
--   - the learner sees their own conversation again when they reopen a
--     lesson
--   - the daily limit per learner is counted from it
--   - admins can review what the tutor told learners
--
-- Rows are written only by the server (service role) from /api/tutor.
-- Learners can read their own rows and cannot insert, edit or delete
-- them, so the daily limit cannot be bypassed from the browser.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  -- Filled on assistant rows: which model answered and what it cost.
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_thread
  ON public.tutor_messages(user_id, lesson_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_usage
  ON public.tutor_messages(user_id, created_at DESC) WHERE role = 'user';

ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners read their tutor conversation" ON public.tutor_messages;
CREATE POLICY "Learners read their tutor conversation"
  ON public.tutor_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all tutor conversations" ON public.tutor_messages;
CREATE POLICY "Admins read all tutor conversations"
  ON public.tutor_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- No INSERT, UPDATE or DELETE policy: only the service role writes.
REVOKE ALL ON public.tutor_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tutor_messages FROM authenticated;
GRANT SELECT ON public.tutor_messages TO authenticated;
