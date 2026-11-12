-- Payment System: pricing, bundles, payments, preview content
-- DataPlus Learning Platform

-- ============================================================
-- 1. Add pricing fields to courses
-- ============================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF';

-- ============================================================
-- 2. Add is_preview flag to chapters and lessons
-- ============================================================
ALTER TABLE public.course_chapters
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;

-- ============================================================
-- 3. Course Bundles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  original_price NUMERIC NOT NULL DEFAULT 0,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_bundles ENABLE ROW LEVEL SECURITY;

-- Everyone can read active bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.course_bundles FOR SELECT
  USING (is_active = true);

-- Admins can manage bundles
CREATE POLICY "Admins can manage bundles"
  ON public.course_bundles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_course_bundles_updated_at
  BEFORE UPDATE ON public.course_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Bundle-Courses join table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bundle_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.course_bundles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, course_id)
);

ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;

-- Everyone can read bundle contents
CREATE POLICY "Anyone can view bundle courses"
  ON public.bundle_courses FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage bundle courses"
  ON public.bundle_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 5. Payments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.course_bundles(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  payment_method TEXT,
  reference_id TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payer_phone TEXT,
  payer_email TEXT,
  callback_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT payment_target CHECK (
    (course_id IS NOT NULL AND bundle_id IS NULL) OR
    (course_id IS NULL AND bundle_id IS NOT NULL)
  )
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Students can view their own payments
CREATE POLICY "Students can view own payments"
  ON public.payments FOR SELECT
  USING (student_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Teachers can view payments for their courses
CREATE POLICY "Teachers can view payments for own courses"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = payments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_bundle_id ON public.payments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON public.payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ============================================================
-- 6. RPC: Create a payment record (called by frontend)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_payment_record(
  p_student_id UUID,
  p_course_id UUID DEFAULT NULL,
  p_bundle_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'RWF',
  p_reference_id TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_payer_phone TEXT DEFAULT NULL,
  p_payer_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  INSERT INTO public.payments (
    student_id, course_id, bundle_id, amount, currency,
    reference_id, payment_method, payer_phone, payer_email, status
  ) VALUES (
    p_student_id, p_course_id, p_bundle_id, p_amount, p_currency,
    p_reference_id, p_payment_method, p_payer_phone, p_payer_email, 'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 7. RPC: Update payment status (called by payment gateway callback)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_reference_id TEXT,
  p_status TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_callback_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_result JSONB;
BEGIN
  -- Get the payment record
  SELECT * INTO v_payment
  FROM public.payments
  WHERE reference_id = p_reference_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Don't re-process already successful payments (idempotent)
  IF v_payment.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  -- Update payment record
  UPDATE public.payments
  SET
    status = p_status,
    transaction_id = COALESCE(p_transaction_id, transaction_id),
    callback_data = COALESCE(p_callback_data, callback_data),
    updated_at = now()
  WHERE reference_id = p_reference_id;

  -- If successful, auto-enroll the student
  IF p_status = 'success' THEN
    IF v_payment.course_id IS NOT NULL THEN
      -- Single course purchase: enroll in the course
      INSERT INTO public.course_enrollments (student_id, course_id)
      VALUES (v_payment.student_id, v_payment.course_id)
      ON CONFLICT DO NOTHING;
    ELSIF v_payment.bundle_id IS NOT NULL THEN
      -- Bundle purchase: enroll in ALL courses in the bundle
      INSERT INTO public.course_enrollments (student_id, course_id)
      SELECT v_payment.student_id, bc.course_id
      FROM public.bundle_courses bc
      WHERE bc.bundle_id = v_payment.bundle_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'status', p_status,
    'enrolled', (p_status = 'success')
  );
END;
$$;

-- ============================================================
-- 8. RPC: Check if user has access to a course
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_course_access(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_free BOOLEAN;
  v_is_enrolled BOOLEAN;
  v_is_teacher BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if course is free
  SELECT COALESCE(is_free, true) INTO v_is_free
  FROM public.courses
  WHERE id = p_course_id;

  IF v_is_free THEN
    RETURN true;
  END IF;

  -- Check if user is the teacher of this course
  SELECT EXISTS(
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = p_user_id
  ) INTO v_is_teacher;

  IF v_is_teacher THEN
    RETURN true;
  END IF;

  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Check if user is enrolled
  SELECT EXISTS(
    SELECT 1 FROM public.course_enrollments
    WHERE student_id = p_user_id AND course_id = p_course_id
  ) INTO v_is_enrolled;

  RETURN v_is_enrolled;
END;
$$;
