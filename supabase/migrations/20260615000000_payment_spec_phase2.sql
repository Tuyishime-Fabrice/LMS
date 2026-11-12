-- Payment spec phase 2: early-bird pricing, instalment plans, cohort payment metadata

-- ============================================================
-- 1. Early-bird pricing on courses (spec §6)
-- ============================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS early_bird_price NUMERIC,
  ADD COLUMN IF NOT EXISTS early_bird_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS early_bird_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS early_bird_max_seats INT,
  ADD COLUMN IF NOT EXISTS early_bird_seats_used INT NOT NULL DEFAULT 0;

-- ============================================================
-- 2. Payment metadata for tracks / cohorts
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_track TEXT DEFAULT 'full'
    CHECK (payment_track IN ('full', 'instalment', 'scholarship', 'early_bird')),
  ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instalment_enrollment_id UUID;

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS instalment_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalment_count INT DEFAULT 2
    CHECK (instalment_count IS NULL OR instalment_count IN (2, 3)),
  ADD COLUMN IF NOT EXISTS instalment_deposit_percent NUMERIC DEFAULT 50
    CHECK (instalment_deposit_percent IS NULL OR (instalment_deposit_percent > 0 AND instalment_deposit_percent < 100));

-- ============================================================
-- 3. Instalment plans per course (spec §7)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_instalment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instalment_count INT NOT NULL DEFAULT 2 CHECK (instalment_count IN (2, 3)),
  deposit_percent NUMERIC NOT NULL DEFAULT 50
    CHECK (deposit_percent > 0 AND deposit_percent < 100),
  grace_days INT NOT NULL DEFAULT 7 CHECK (grace_days >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id)
);

ALTER TABLE public.course_instalment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active instalment plans"
  ON public.course_instalment_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage instalment plans"
  ON public.course_instalment_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS public.student_instalment_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.course_instalment_plans(id) ON DELETE RESTRICT,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'RWF',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instalment_enrollments_student
  ON public.student_instalment_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_instalment_enrollments_course
  ON public.student_instalment_enrollments(course_id);

ALTER TABLE public.student_instalment_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own instalment enrollments"
  ON public.student_instalment_enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins manage instalment enrollments"
  ON public.student_instalment_enrollments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS public.instalment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.student_instalment_enrollments(id) ON DELETE CASCADE,
  instalment_number INT NOT NULL CHECK (instalment_number >= 1),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (enrollment_id, instalment_number)
);

CREATE INDEX IF NOT EXISTS idx_instalment_schedules_enrollment
  ON public.instalment_schedules(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_instalment_schedules_due
  ON public.instalment_schedules(due_date) WHERE status = 'pending';

ALTER TABLE public.instalment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own instalment schedules"
  ON public.instalment_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_instalment_enrollments e
      WHERE e.id = enrollment_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage instalment schedules"
  ON public.instalment_schedules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_instalment_enrollment_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_instalment_enrollment_id_fkey
  FOREIGN KEY (instalment_enrollment_id)
  REFERENCES public.student_instalment_enrollments(id) ON DELETE SET NULL;

-- ============================================================
-- 4. RPC: Create instalment enrollment + schedule
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_instalment_enrollment(
  p_student_id UUID,
  p_course_id UUID,
  p_total_amount NUMERIC,
  p_currency TEXT DEFAULT 'RWF',
  p_cohort_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_enrollment_id UUID;
  v_deposit NUMERIC;
  v_remainder NUMERIC;
  v_per_instalment NUMERIC;
  v_i INT;
BEGIN
  SELECT * INTO v_plan
  FROM public.course_instalment_plans
  WHERE course_id = p_course_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No instalment plan for this course');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_instalment_enrollments
    WHERE student_id = p_student_id AND course_id = p_course_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active instalment plan already exists');
  END IF;

  v_deposit := ROUND(p_total_amount * v_plan.deposit_percent / 100, 0);
  v_remainder := p_total_amount - v_deposit;
  v_per_instalment := ROUND(v_remainder / (v_plan.instalment_count - 1), 0);

  INSERT INTO public.student_instalment_enrollments (
    student_id, course_id, plan_id, cohort_id, total_amount, currency, status
  ) VALUES (
    p_student_id, p_course_id, v_plan.id, p_cohort_id, p_total_amount, p_currency, 'active'
  )
  RETURNING id INTO v_enrollment_id;

  INSERT INTO public.instalment_schedules (enrollment_id, instalment_number, amount, due_date, status)
  VALUES (v_enrollment_id, 1, v_deposit, CURRENT_DATE, 'pending');

  FOR v_i IN 2..v_plan.instalment_count LOOP
    INSERT INTO public.instalment_schedules (enrollment_id, instalment_number, amount, due_date, status)
    VALUES (
      v_enrollment_id,
      v_i,
      CASE WHEN v_i = v_plan.instalment_count THEN v_remainder - (v_per_instalment * (v_plan.instalment_count - 2)) ELSE v_per_instalment END,
      (CURRENT_DATE + ((v_i - 1) * INTERVAL '30 days'))::DATE,
      'pending'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'deposit_amount', v_deposit,
    'instalment_count', v_plan.instalment_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_instalment_enrollment(UUID, UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_instalment_enrollment(UUID, UUID, NUMERIC, TEXT, UUID) TO service_role;

-- ============================================================
-- 5. Update create_payment_record for track / cohort / instalment
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
  p_payer_email TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT 'lmbtech',
  p_provider_ref_id TEXT DEFAULT NULL,
  p_coupon_id UUID DEFAULT NULL,
  p_original_amount NUMERIC DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0,
  p_payment_track TEXT DEFAULT 'full',
  p_cohort_id UUID DEFAULT NULL,
  p_instalment_enrollment_id UUID DEFAULT NULL
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
    reference_id, payment_method, payer_phone, payer_email,
    payment_provider, provider_ref_id, coupon_id,
    original_amount, discount_amount, status,
    payment_track, cohort_id, instalment_enrollment_id
  ) VALUES (
    p_student_id, p_course_id, p_bundle_id, p_amount, p_currency,
    p_reference_id, p_payment_method, p_payer_phone, p_payer_email,
    COALESCE(p_payment_provider, 'xentripay'), p_provider_ref_id, p_coupon_id,
    COALESCE(p_original_amount, p_amount), COALESCE(p_discount_amount, 0), 'pending',
    COALESCE(p_payment_track, 'full'), p_cohort_id, p_instalment_enrollment_id
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 6. Update payment status — early bird seats + instalment mark paid
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
  v_schedule_id UUID;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE reference_id = p_reference_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  UPDATE public.payments
  SET
    status = p_status,
    transaction_id = COALESCE(p_transaction_id, transaction_id),
    callback_data = COALESCE(p_callback_data, callback_data),
    updated_at = now()
  WHERE reference_id = p_reference_id;

    IF p_status = 'success' THEN
    IF v_payment.payment_track = 'early_bird' AND v_payment.course_id IS NOT NULL THEN
      UPDATE public.courses
      SET early_bird_seats_used = early_bird_seats_used + 1
      WHERE id = v_payment.course_id
        AND (early_bird_max_seats IS NULL OR early_bird_seats_used < early_bird_max_seats);
    ELSIF COALESCE(p_callback_data->>'early_bird', 'false') = 'true' AND v_payment.course_id IS NOT NULL THEN
      UPDATE public.courses
      SET early_bird_seats_used = early_bird_seats_used + 1
      WHERE id = v_payment.course_id
        AND (early_bird_max_seats IS NULL OR early_bird_seats_used < early_bird_max_seats);
    END IF;

    IF v_payment.instalment_enrollment_id IS NOT NULL THEN
      SELECT s.id INTO v_schedule_id
      FROM public.instalment_schedules s
      WHERE s.enrollment_id = v_payment.instalment_enrollment_id
        AND s.status = 'pending'
      ORDER BY s.instalment_number
      LIMIT 1;

      IF v_schedule_id IS NOT NULL THEN
        UPDATE public.instalment_schedules
        SET status = 'paid', payment_id = v_payment.id, paid_at = now()
        WHERE id = v_schedule_id;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.instalment_schedules s
        WHERE s.enrollment_id = v_payment.instalment_enrollment_id AND s.status = 'pending'
      ) THEN
        UPDATE public.student_instalment_enrollments
        SET status = 'completed', updated_at = now()
        WHERE id = v_payment.instalment_enrollment_id;
      END IF;
    END IF;

    IF v_payment.course_id IS NOT NULL THEN
      IF v_payment.payment_track = 'instalment' AND v_payment.instalment_enrollment_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.instalment_schedules s
          WHERE s.enrollment_id = v_payment.instalment_enrollment_id AND s.instalment_number > 1 AND s.status = 'pending'
        ) OR EXISTS (
          SELECT 1 FROM public.instalment_schedules s
          WHERE s.enrollment_id = v_payment.instalment_enrollment_id AND s.instalment_number = 1 AND s.status = 'paid'
        ) THEN
          INSERT INTO public.course_enrollments (student_id, course_id)
          VALUES (v_payment.student_id, v_payment.course_id)
          ON CONFLICT DO NOTHING;
        END IF;
      ELSE
        INSERT INTO public.course_enrollments (student_id, course_id)
        VALUES (v_payment.student_id, v_payment.course_id)
        ON CONFLICT DO NOTHING;
      END IF;
    ELSIF v_payment.bundle_id IS NOT NULL THEN
      INSERT INTO public.course_enrollments (student_id, course_id)
      SELECT v_payment.student_id, bc.course_id
      FROM public.bundle_courses bc
      WHERE bc.bundle_id = v_payment.bundle_id
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_payment.coupon_id IS NOT NULL THEN
      PERFORM public.redeem_coupon_for_payment(v_payment.id);
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

-- Admin instalment overview
CREATE OR REPLACE FUNCTION public.get_instalment_tracker()
RETURNS TABLE (
  enrollment_id UUID,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  course_id UUID,
  course_title TEXT,
  total_amount NUMERIC,
  currency TEXT,
  status TEXT,
  paid_count BIGINT,
  pending_count BIGINT,
  overdue_count BIGINT,
  next_due_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.student_id,
    p.full_name,
    p.email,
    e.course_id,
    c.title,
    e.total_amount,
    e.currency,
    e.status,
    COUNT(*) FILTER (WHERE s.status = 'paid'),
    COUNT(*) FILTER (WHERE s.status = 'pending'),
    COUNT(*) FILTER (WHERE s.status = 'overdue'),
    MIN(s.due_date) FILTER (WHERE s.status IN ('pending', 'overdue')),
    e.created_at
  FROM public.student_instalment_enrollments e
  JOIN public.profiles p ON p.id = e.student_id
  JOIN public.courses c ON c.id = e.course_id
  LEFT JOIN public.instalment_schedules s ON s.enrollment_id = e.id
  GROUP BY e.id, p.full_name, p.email, c.title
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_instalment_tracker() TO authenticated;
