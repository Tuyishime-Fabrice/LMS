-- Fix for existing policies - makes migration idempotent
-- Run this if you get "policy already exists" errors

-- Drop and recreate policies for activity_logs
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Drop and recreate policies for system_settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Drop and recreate policies for course_approvals (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_approvals') THEN
    DROP POLICY IF EXISTS "Admins can manage course approvals" ON public.course_approvals;
    DROP POLICY IF EXISTS "Teachers can view their course approval status" ON public.course_approvals;

    CREATE POLICY "Admins can manage course approvals"
      ON public.course_approvals FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );

    CREATE POLICY "Teachers can view their course approval status"
      ON public.course_approvals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.courses 
          WHERE id = course_approvals.course_id AND teacher_id = auth.uid()
        )
      );
  END IF;
END $$;
