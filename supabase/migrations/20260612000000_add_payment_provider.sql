-- Add payment gateway provider support (LMBTech + XentriPay)

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'lmbtech',
  ADD COLUMN IF NOT EXISTS provider_ref_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_payment_provider ON public.payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref_id ON public.payments(provider_ref_id);

-- Update create_payment_record to store gateway provider
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
  p_provider_ref_id TEXT DEFAULT NULL
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
    payment_provider, provider_ref_id, status
  ) VALUES (
    p_student_id, p_course_id, p_bundle_id, p_amount, p_currency,
    p_reference_id, p_payment_method, p_payer_phone, p_payer_email,
    COALESCE(p_payment_provider, 'lmbtech'), p_provider_ref_id, 'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;
