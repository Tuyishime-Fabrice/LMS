-- Coupon security hardening:
-- 1. Scholarship RPCs must use auth.uid(), not caller-supplied admin id
-- 2. Scholarship coupons only redeemable by the approved applicant

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_student_id UUID,
  p_course_id UUID DEFAULT NULL,
  p_bundle_id UUID DEFAULT NULL,
  p_original_amount NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'RWF'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_user_uses INT;
  v_code TEXT;
BEGIN
  v_code := UPPER(TRIM(p_code));
  IF v_code = '' OR v_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon code is required');
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = v_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon is no longer active');
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon is not yet valid');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has expired');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has already been used');
  END IF;

  IF v_coupon.applies_to = 'course' AND (p_course_id IS NULL OR v_coupon.course_id <> p_course_id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon does not apply to this course');
  END IF;

  IF v_coupon.applies_to = 'bundle' AND (p_bundle_id IS NULL OR v_coupon.bundle_id <> p_bundle_id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon does not apply to this bundle');
  END IF;

  IF COALESCE(v_coupon.coupon_type, 'promo') = 'scholarship' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.scholarship_applications sa
      WHERE sa.coupon_id = v_coupon.id
        AND sa.student_id = p_student_id
        AND sa.status = 'approved'
    ) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'This scholarship code is not assigned to your account');
    END IF;
  END IF;

  IF v_coupon.min_purchase_amount IS NOT NULL AND p_original_amount < v_coupon.min_purchase_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Minimum purchase amount not met');
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.coupon_redemptions cr
    JOIN public.payments p ON p.id = cr.payment_id
    WHERE cr.coupon_id = v_coupon.id
      AND cr.student_id = p_student_id
      AND p.status = 'success';

    IF v_user_uses >= v_coupon.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
    END IF;
  END IF;

  IF v_coupon.discount_type = 'percent' THEN
    v_discount := ROUND(p_original_amount * (v_coupon.discount_value / 100.0), 2);
  ELSE
    IF v_coupon.currency IS NOT NULL AND UPPER(v_coupon.currency) <> UPPER(COALESCE(p_currency, 'RWF')) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Coupon currency does not match purchase currency');
    END IF;
    v_discount := LEAST(v_coupon.discount_value, p_original_amount);
  END IF;

  v_final := GREATEST(p_original_amount - v_discount, 0);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'original_amount', p_original_amount,
    'discount_amount', v_discount,
    'final_amount', v_final,
    'currency', p_currency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_scholarship_application(
  p_application_id UUID,
  p_admin_id UUID,
  p_scholarship_level TEXT DEFAULT 'partial',
  p_discount_percent NUMERIC DEFAULT 50,
  p_discount_fixed NUMERIC DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_code TEXT;
  v_coupon_id UUID;
  v_discount_type TEXT;
  v_discount_value NUMERIC;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_app FROM public.scholarship_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  IF v_app.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application already reviewed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = v_app.course_id
      AND c.scholarship_slots_max IS NOT NULL
      AND c.scholarship_slots_used >= c.scholarship_slots_max
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No scholarship slots remaining');
  END IF;

  IF p_scholarship_level = 'full' OR COALESCE(p_discount_percent, 0) >= 100 THEN
    v_discount_type := 'percent';
    v_discount_value := 100;
  ELSIF p_scholarship_level = 'reduced' AND p_discount_fixed IS NOT NULL THEN
    v_discount_type := 'fixed';
    v_discount_value := p_discount_fixed;
  ELSE
    v_discount_type := 'percent';
    v_discount_value := COALESCE(p_discount_percent, 50);
  END IF;

  v_code := 'SCHOLAR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));

  INSERT INTO public.coupons (
    code, description, discount_type, discount_value, currency,
    max_uses, max_uses_per_user, applies_to, course_id,
    coupon_type, is_active, created_by
  )
  SELECT
    v_code,
    'Scholarship for ' || c.title,
    v_discount_type,
    v_discount_value,
    COALESCE(c.currency, 'RWF'),
    1,
    1,
    'course',
    v_app.course_id,
    'scholarship',
    true,
    v_admin_id
  FROM public.courses c
  WHERE c.id = v_app.course_id
  RETURNING id INTO v_coupon_id;

  UPDATE public.scholarship_applications
  SET
    status = 'approved',
    scholarship_level = p_scholarship_level,
    discount_percent = CASE WHEN v_discount_type = 'percent' THEN v_discount_value ELSE NULL END,
    discount_fixed = CASE WHEN v_discount_type = 'fixed' THEN v_discount_value ELSE NULL END,
    coupon_id = v_coupon_id,
    generated_code = v_code,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_application_id;

  UPDATE public.courses
  SET scholarship_slots_used = scholarship_slots_used + 1
  WHERE id = v_app.course_id;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'coupon_id', v_coupon_id,
    'discount_type', v_discount_type,
    'discount_value', v_discount_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_scholarship_application(
  p_application_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  UPDATE public.scholarship_applications
  SET
    status = 'rejected',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_application_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found or already reviewed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) TO service_role;
