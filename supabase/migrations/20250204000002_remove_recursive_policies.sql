-- CRITICAL FIX: Remove all policies that query profiles table
-- This prevents infinite recursion in RLS

-- 1. Drop ALL policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Drop course_approvals policies only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_approvals') THEN
    DROP POLICY IF EXISTS "Admins can manage course approvals" ON public.course_approvals;
    DROP POLICY IF EXISTS "Teachers can view their course approval status" ON public.course_approvals;
  END IF;
END $$;

-- 2. Create simple policies that don't query profiles
-- Activity logs: Allow inserts from anyone (for logging), no selects via policy
CREATE POLICY "Allow activity log inserts"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- System settings: No policies - use RPC functions only
-- (Admins will use get_system_settings() and update_system_setting() functions)

-- 3. Create RPC functions for admin operations

-- Function to get activity logs with user details (admin only)
CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  user_full_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    l.id,
    l.user_id,
    l.action,
    l.entity_type,
    l.entity_id,
    l.details,
    l.ip_address,
    l.user_agent,
    l.created_at,
    p.full_name as user_full_name,
    p.email as user_email
  FROM public.activity_logs l
  LEFT JOIN public.profiles p ON l.user_id = p.id
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system settings (admin only)
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS TABLE (
  id UUID,
  key TEXT,
  value JSONB,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.key,
    s.value,
    s.description,
    s.updated_by,
    s.updated_at
  FROM public.system_settings s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update system setting (admin only)
CREATE OR REPLACE FUNCTION public.update_system_setting(
  p_key TEXT,
  p_value JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_setting_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  INSERT INTO public.system_settings (key, value, description, updated_by)
  VALUES (p_key, p_value, p_description, auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET value = p_value,
      description = COALESCE(p_description, system_settings.description),
      updated_by = auth.uid(),
      updated_at = NOW()
  RETURNING id INTO v_setting_id;

  RETURN v_setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get course approvals (admin only)
CREATE OR REPLACE FUNCTION public.get_course_approvals()
RETURNS TABLE (
  id UUID,
  course_id UUID,
  status TEXT,
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_approvals') THEN
    RAISE EXCEPTION 'Course approvals table does not exist.';
  END IF;

  RETURN QUERY
  SELECT 
    ca.id,
    ca.course_id,
    ca.status,
    ca.reviewed_by,
    ca.review_notes,
    ca.created_at,
    ca.reviewed_at
  FROM public.course_approvals ca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add comments
COMMENT ON FUNCTION public.get_activity_logs IS 'Get activity logs for admin users only';
COMMENT ON FUNCTION public.get_system_settings IS 'Get system settings for admin users only';
COMMENT ON FUNCTION public.update_system_setting IS 'Update system setting (admin only)';
COMMENT ON FUNCTION public.get_course_approvals IS 'Get course approvals for admin users only';
