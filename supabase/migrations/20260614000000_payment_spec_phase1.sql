-- Payment spec phase 1: free checkout, coupon types, pricing tiers, scholarships, cohort pricing

-- ============================================================
-- 1. Coupon type (spec §3.1)
-- ============================================================
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS coupon_type TEXT NOT NULL DEFAULT 'promo';

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_coupon_type_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_coupon_type_check CHECK (
    coupon_type IN ('promo', 'scholarship', 'early_bird', 'staff', 'referral')
  );

-- ============================================================
-- 2. Audience pricing tier on profiles (spec §1)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pricing_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pricing_tier_check CHECK (
    pricing_tier IN ('standard', 'student', 'ngo', 'corporate', 'partner')
  );

-- ============================================================
-- 3. Per-course tier prices (spec §1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tier_code TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'RWF',
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id, tier_code)
);

CREATE INDEX IF NOT EXISTS idx_course_price_tiers_course ON public.course_price_tiers(course_id);

ALTER TABLE public.course_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active course price tiers"
  ON public.course_price_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage course price tiers"
  ON public.course_price_tiers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. Scholarship settings on courses (spec §4)
-- ============================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS scholarship_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scholarship_slots_max INT,
  ADD COLUMN IF NOT EXISTS scholarship_slots_used INT NOT NULL DEFAULT 0;

-- ============================================================
-- 5. Scholarship applications (spec §4)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organisation TEXT,
  motivation TEXT NOT NULL,
  income_band TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'redeemed')),
  scholarship_level TEXT
    CHECK (scholarship_level IS NULL OR scholarship_level IN ('full', 'partial', 'reduced')),
  discount_percent NUMERIC,
  discount_fixed NUMERIC,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  generated_code TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scholarship_apps_course ON public.scholarship_applications(course_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_student ON public.scholarship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_status ON public.scholarship_applications(status);

ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own scholarship applications"
  ON public.scholarship_applications FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins manage all scholarship applications"
  ON public.scholarship_applications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. Cohort pricing / payment tracks (spec §5)
-- ============================================================
ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS price NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cohort_join_requests
  ADD COLUMN IF NOT EXISTS payment_track TEXT DEFAULT 'full'
    CHECK (payment_track IN ('full', 'instalment', 'scholarship'));

-- ============================================================
-- 7. RPC: Approve scholarship → generate single-use coupon
-- ============================================================
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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin'
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
    p_admin_id
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
    reviewed_by = p_admin_id,
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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  UPDATE public.scholarship_applications
  SET
    status = 'rejected',
    reviewed_by = p_admin_id,
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

-- Mark scholarship redeemed when coupon used on successful payment
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
  v_coupon_type TEXT;
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

  SELECT coupon_type INTO v_coupon_type FROM public.coupons WHERE id = v_payment.coupon_id;

  IF v_coupon_type = 'scholarship' THEN
    UPDATE public.scholarship_applications
    SET status = 'redeemed', updated_at = now()
    WHERE coupon_id = v_payment.coupon_id AND student_id = v_payment.student_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_scholarship_application(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_scholarship_application(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reject_scholarship_application(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_scholarship_application(UUID, UUID, TEXT) TO authenticated, service_role;
