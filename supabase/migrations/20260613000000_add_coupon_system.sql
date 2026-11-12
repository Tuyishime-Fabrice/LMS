-- Coupon / promo code system

-- ============================================================
-- 1. Coupons table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  currency TEXT DEFAULT 'RWF',
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  max_uses_per_user INT DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'course', 'bundle')),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.course_bundles(id) ON DELETE SET NULL,
  min_purchase_amount NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT coupons_scope CHECK (
    (applies_to = 'all' AND course_id IS NULL AND bundle_id IS NULL) OR
    (applies_to = 'course' AND course_id IS NOT NULL AND bundle_id IS NULL) OR
    (applies_to = 'bundle' AND bundle_id IS NOT NULL AND course_id IS NULL)
  ),
  CONSTRAINT coupons_percent_max CHECK (
    discount_type <> 'percent' OR discount_value <= 100
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON public.coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons (is_active);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Coupon redemptions (audit + per-user limits)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_student ON public.coupon_redemptions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemptions_payment ON public.coupon_redemptions(payment_id)
  WHERE payment_id IS NOT NULL;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 3. Extend payments with coupon fields
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payments_coupon_id ON public.payments(coupon_id);

-- ============================================================
-- 4. RPC: Validate coupon (read-only, no redemption)
-- ============================================================
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

-- ============================================================
-- 5. RPC: Redeem coupon on successful payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_payment(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_updated INT;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

  IF NOT FOUND OR v_payment.coupon_id IS NULL OR v_payment.status <> 'success' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nothing to redeem');
  END IF;

  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE payment_id = p_payment_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already redeemed');
  END IF;

  UPDATE public.coupons
  SET uses_count = uses_count + 1, updated_at = now()
  WHERE id = v_payment.coupon_id
    AND (max_uses IS NULL OR uses_count < max_uses);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon usage limit reached');
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, student_id, payment_id, discount_amount)
  VALUES (v_payment.coupon_id, v_payment.student_id, p_payment_id, COALESCE(v_payment.discount_amount, 0));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 6. Update create_payment_record for coupon fields
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
  p_discount_amount NUMERIC DEFAULT 0
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
    original_amount, discount_amount, status
  ) VALUES (
    p_student_id, p_course_id, p_bundle_id, p_amount, p_currency,
    p_reference_id, p_payment_method, p_payer_phone, p_payer_email,
    COALESCE(p_payment_provider, 'xentripay'), p_provider_ref_id, p_coupon_id,
    COALESCE(p_original_amount, p_amount), COALESCE(p_discount_amount, 0), 'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 7. Update payment status — enroll + redeem coupon
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
    IF v_payment.course_id IS NOT NULL THEN
      INSERT INTO public.course_enrollments (student_id, course_id)
      VALUES (v_payment.student_id, v_payment.course_id)
      ON CONFLICT DO NOTHING;
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

-- Restrict coupon RPCs to service role (API uses service role key)
REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.redeem_coupon_for_payment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_coupon_for_payment(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_payment(UUID) TO service_role;
