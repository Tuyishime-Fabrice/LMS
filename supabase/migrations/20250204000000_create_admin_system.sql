--=====================================================
-- Admin System Migration
-- Creates admin role, teacher approval, and activity logs
-- =====================================================

-- 1. Update user_role enum to include admin
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');
  ELSE
    -- Add admin to existing enum if not present
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
  END IF;
END $$;

-- 2. Add teacher approval fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS teacher_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS teacher_approval_status TEXT DEFAULT 'pending' CHECK (teacher_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS teacher_approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teacher_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS teacher_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 3. Create activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 4. Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create course approval table (only if courses table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    CREATE TABLE IF NOT EXISTS public.course_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by UUID REFERENCES public.profiles(id),
      review_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      UNIQUE(course_id)
    );
  END IF;
END $$;

-- 6. Add approval status to courses (only if courses table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    
    ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    
    ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS category TEXT;
  END IF;
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_approvals') THEN
    ALTER TABLE public.course_approvals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 8. RLS Policies for activity_logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'Admins can view all activity logs'
  ) THEN
    CREATE POLICY "Admins can view all activity logs"
      ON public.activity_logs FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_logs' 
    AND policyname = 'System can insert activity logs'
  ) THEN
    CREATE POLICY "System can insert activity logs"
      ON public.activity_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 9. RLS Policies for system_settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Admins can manage system settings'
  ) THEN
    CREATE POLICY "Admins can manage system settings"
      ON public.system_settings FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 10. RLS Policies for course_approvals (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_approvals') THEN
    EXECUTE 'CREATE POLICY "Admins can manage course approvals"
      ON public.course_approvals FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
      )';

    EXECUTE 'CREATE POLICY "Teachers can view their course approval status"
      ON public.course_approvals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE id = course_approvals.course_id AND teacher_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- 11. Update profiles RLS to allow admins to see all profiles
-- Note: We don't add admin policies here to avoid infinite recursion
-- Admins will use their own profile view policy (auth.uid() = id)
-- For viewing other profiles, use a service role or separate admin function

-- 12. Function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to get all profiles (for admins only)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  teacher_approved BOOLEAN,
  teacher_approval_status TEXT,
  is_suspended BOOLEAN,
  suspension_reason TEXT,
  last_login TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller is admin
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
    p.created_at,
    p.updated_at,
    p.teacher_approved,
    p.teacher_approval_status,
    p.is_suspended,
    p.suspension_reason,
    p.last_login
  FROM public.profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('site_name', '"DataPlus Learning"', 'Platform name'),
  ('require_teacher_approval', 'true', 'Require admin approval for new teachers'),
  ('require_course_approval', 'false', 'Require admin approval for new courses'),
  ('maintenance_mode', 'false', 'Enable maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- 16. Add comments
COMMENT ON TABLE public.activity_logs IS 'Tracks all important actions in the system';
COMMENT ON TABLE public.system_settings IS 'Global system configuration';
COMMENT ON FUNCTION public.is_admin IS 'Check if user has admin role without causing recursion';
COMMENT ON FUNCTION public.get_all_profiles IS 'Get all profiles for admin users only';
COMMENT ON TABLE public.course_approvals IS 'Course approval workflow';
COMMENT ON COLUMN public.profiles.teacher_approved IS 'Whether teacher account is approved by admin';
COMMENT ON COLUMN public.profiles.is_suspended IS 'Whether user account is suspended';
