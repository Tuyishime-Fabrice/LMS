-- Migration: Admin Dashboard Real-Time Statistics
-- This creates functions to get accurate user statistics for the admin dashboard

-- Add last_activity column if it doesn't exist
DO $do_block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $do_block$;

-- Function to update user activity (called by frontend heartbeat)
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  UPDATE profiles 
  SET last_activity = NOW()
  WHERE id = auth.uid();
END;
$func$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_activity() TO authenticated;

-- Function to get dashboard statistics with online user counts
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
  total_users INT;
  total_students INT;
  total_teachers INT;
  pending_teachers INT;
  total_courses INT;
  pending_courses INT;
  suspended_users INT;
  online_students INT;
  online_teachers INT;
  online_users INT;
  active_week INT;
BEGIN
  -- Total counts by role
  SELECT COUNT(*) INTO total_users FROM profiles;
  SELECT COUNT(*) INTO total_students FROM profiles WHERE role = 'student';
  SELECT COUNT(*) INTO total_teachers FROM profiles WHERE role = 'teacher';
  
  -- Pending teacher approvals
  SELECT COUNT(*) INTO pending_teachers 
  FROM profiles 
  WHERE role = 'teacher' AND teacher_approval_status = 'pending';
  
  -- Suspended users
  SELECT COUNT(*) INTO suspended_users 
  FROM profiles 
  WHERE is_suspended = true;
  
  -- Course counts
  SELECT COUNT(*) INTO total_courses FROM courses;
  SELECT COUNT(*) INTO pending_courses 
  FROM courses 
  WHERE approval_status = 'pending';
  
  -- Online users (active in last 5 minutes based on last_activity)
  SELECT COUNT(*) INTO online_students 
  FROM profiles 
  WHERE role = 'student' 
    AND last_activity >= NOW() - INTERVAL '5 minutes';
  
  SELECT COUNT(*) INTO online_teachers 
  FROM profiles 
  WHERE role = 'teacher' 
    AND last_activity >= NOW() - INTERVAL '5 minutes';
  
  online_users := online_students + online_teachers;
  
  -- Active users this week (based on last_activity)
  SELECT COUNT(*) INTO active_week 
  FROM profiles 
  WHERE last_activity >= NOW() - INTERVAL '7 days';
  
  -- Build result JSON
  result := json_build_object(
    'totalUsers', total_users,
    'totalStudents', total_students,
    'totalTeachers', total_teachers,
    'pendingTeachers', pending_teachers,
    'totalCourses', total_courses,
    'pendingCourses', pending_courses,
    'suspendedUsers', suspended_users,
    'onlineStudents', online_students,
    'onlineTeachers', online_teachers,
    'onlineUsers', online_users,
    'activeThisWeek', active_week
  );
  
  RETURN result;
END;
$func$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;

-- Update get_all_profiles to include phone field
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  phone TEXT,
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

-- Update get_all_student_progress to include phone
CREATE OR REPLACE FUNCTION public.get_all_student_progress()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT,
  course_id UUID,
  course_title TEXT,
  teacher_name TEXT,
  enrolled_at TIMESTAMPTZ,
  total_lessons BIGINT,
  completed_lessons BIGINT,
  progress_percentage INT,
  last_activity TIMESTAMPTZ
) AS $func$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS student_id,
    p.full_name AS student_name,
    p.email AS student_email,
    p.phone AS student_phone,
    c.id AS course_id,
    c.title AS course_title,
    t.full_name AS teacher_name,
    ce.created_at AS enrolled_at,
    COALESCE((SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id), 0) AS total_lessons,
    COALESCE((SELECT COUNT(*) FROM lesson_progress lp 
              JOIN lessons l ON l.id = lp.lesson_id 
              WHERE lp.user_id = p.id AND l.course_id = c.id AND lp.completed = true), 0) AS completed_lessons,
    CASE 
      WHEN (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) = 0 THEN 0
      ELSE ROUND(
        (COALESCE((SELECT COUNT(*) FROM lesson_progress lp 
                   JOIN lessons l ON l.id = lp.lesson_id 
                   WHERE lp.user_id = p.id AND l.course_id = c.id AND lp.completed = true), 0)::NUMERIC / 
         (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id)::NUMERIC) * 100
      )::INT
    END AS progress_percentage,
    (SELECT MAX(lp.updated_at) FROM lesson_progress lp 
     JOIN lessons l ON l.id = lp.lesson_id 
     WHERE lp.user_id = p.id AND l.course_id = c.id) AS last_activity
  FROM profiles p
  JOIN course_enrollments ce ON ce.student_id = p.id
  JOIN courses c ON c.id = ce.course_id
  LEFT JOIN profiles t ON t.id = c.teacher_id
  WHERE p.role = 'student';
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_student_progress() TO authenticated;
