-- Phase 3 fixes: pay next instalment, cohort-aware payments, admin coupon stats

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS instalment_schedule_id UUID REFERENCES public.instalment_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_instalment_schedule
  ON public.payments(instalment_schedule_id) WHERE instalment_schedule_id IS NOT NULL;

-- Student: list pending/overdue instalments
CREATE OR REPLACE FUNCTION public.get_student_pending_instalments(p_student_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  schedule_id UUID,
  enrollment_id UUID,
  course_id UUID,
  course_title TEXT,
  instalment_number INT,
  amount NUMERIC,
  currency TEXT,
  due_date DATE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    e.id,
    e.course_id,
    c.title,
    s.instalment_number,
    s.amount,
    e.currency,
    s.due_date,
    s.status
  FROM public.instalment_schedules s
  JOIN public.student_instalment_enrollments e ON e.id = s.enrollment_id
  JOIN public.courses c ON c.id = e.course_id
  WHERE e.student_id = p_student_id
    AND e.status = 'active'
    AND s.status IN ('pending', 'overdue')
  ORDER BY s.due_date, s.instalment_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_pending_instalments(UUID) TO authenticated;

-- Admin: coupon redemption summary
CREATE OR REPLACE FUNCTION public.get_coupon_redemption_stats()
RETURNS TABLE (
  coupon_id UUID,
  code TEXT,
  coupon_type TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  max_uses INT,
  uses_count INT,
  redemption_count BIGINT,
  total_discount NUMERIC,
  is_active BOOLEAN
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
    c.id,
    c.code,
    c.coupon_type,
    c.discount_type,
    c.discount_value,
    c.max_uses,
    c.uses_count,
    COUNT(cr.id),
    COALESCE(SUM(cr.discount_amount), 0),
    c.is_active
  FROM public.coupons c
  LEFT JOIN public.coupon_redemptions cr ON cr.coupon_id = c.id
  GROUP BY c.id
  ORDER BY COUNT(cr.id) DESC, c.code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coupon_redemption_stats() TO authenticated;

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
  p_instalment_enrollment_id UUID DEFAULT NULL,
  p_instalment_schedule_id UUID DEFAULT NULL
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
    payment_track, cohort_id, instalment_enrollment_id, instalment_schedule_id
  ) VALUES (
    p_student_id, p_course_id, p_bundle_id, p_amount, p_currency,
    p_reference_id, p_payment_method, p_payer_phone, p_payer_email,
    COALESCE(p_payment_provider, 'xentripay'), p_provider_ref_id, p_coupon_id,
    COALESCE(p_original_amount, p_amount), COALESCE(p_discount_amount, 0), 'pending',
    COALESCE(p_payment_track, 'full'), p_cohort_id, p_instalment_enrollment_id, p_instalment_schedule_id
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

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
  v_should_enroll BOOLEAN := false;
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
      IF v_payment.instalment_schedule_id IS NOT NULL THEN
        v_schedule_id := v_payment.instalment_schedule_id;
      ELSE
        SELECT s.id INTO v_schedule_id
        FROM public.instalment_schedules s
        WHERE s.enrollment_id = v_payment.instalment_enrollment_id
          AND s.status IN ('pending', 'overdue')
        ORDER BY s.instalment_number
        LIMIT 1;
      END IF;

      IF v_schedule_id IS NOT NULL THEN
        UPDATE public.instalment_schedules
        SET status = 'paid', payment_id = v_payment.id, paid_at = now()
        WHERE id = v_schedule_id AND status IN ('pending', 'overdue');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.instalment_schedules s
        WHERE s.enrollment_id = v_payment.instalment_enrollment_id
          AND s.status IN ('pending', 'overdue')
      ) THEN
        UPDATE public.student_instalment_enrollments
        SET status = 'completed', updated_at = now()
        WHERE id = v_payment.instalment_enrollment_id;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM public.instalment_schedules s
        WHERE s.enrollment_id = v_payment.instalment_enrollment_id
          AND s.instalment_number = 1
          AND s.status = 'paid'
      ) INTO v_should_enroll;
    END IF;

    IF v_payment.course_id IS NOT NULL THEN
      IF v_payment.payment_track = 'instalment' AND v_payment.instalment_enrollment_id IS NOT NULL THEN
        IF v_should_enroll OR v_payment.instalment_schedule_id IS NULL THEN
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
