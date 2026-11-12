-- Extend admin profile helpers for pricing tiers

DROP FUNCTION IF EXISTS public.get_all_profiles();

CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  phone TEXT,
  pricing_tier TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  teacher_approved BOOLEAN,
  teacher_approval_status TEXT,
  is_suspended BOOLEAN,
  suspension_reason TEXT,
  last_login TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
) AS $func$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role::TEXT,
    p.avatar_url,
    p.phone,
    p.pricing_tier,
    p.created_at,
    p.updated_at,
    p.teacher_approved,
    p.teacher_approval_status,
    p.is_suspended,
    p.suspension_reason,
    p.last_login,
    p.last_activity
  FROM public.profiles p;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_user_pricing_tier(
  p_user_id UUID,
  p_pricing_tier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  IF p_pricing_tier NOT IN ('standard', 'student', 'ngo', 'corporate', 'partner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid pricing tier');
  END IF;

  UPDATE public.profiles
  SET pricing_tier = p_pricing_tier, updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'pricing_tier', p_pricing_tier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_pricing_tier(UUID, TEXT) TO authenticated;
