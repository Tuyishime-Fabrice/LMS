-- Harden coupon security (safe to re-run if prior migration was applied without these fixes)

DROP POLICY IF EXISTS "Anyone can read active coupons metadata" ON public.coupons;

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_percent_max;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_percent_max CHECK (
    discount_type <> 'percent' OR discount_value <= 100
  );

REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, UUID, UUID, NUMERIC, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.redeem_coupon_for_payment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_coupon_for_payment(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_payment(UUID) TO service_role;
