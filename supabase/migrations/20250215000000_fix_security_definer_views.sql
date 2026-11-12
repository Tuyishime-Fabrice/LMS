-- Fix Security Definer Views
-- This migration recreates views with SECURITY INVOKER to ensure RLS policies are respected

-- Drop and recreate conversations_with_details view with SECURITY INVOKER
DROP VIEW IF EXISTS public.conversations_with_details;

CREATE VIEW public.conversations_with_details
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  sp.full_name as student_name,
  sp.avatar_url as student_avatar,
  tp.full_name as teacher_name,
  tp.avatar_url as teacher_avatar,
  (
    SELECT dm.message_text
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) as last_message,
  (
    SELECT dm.created_at
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) as last_message_at,
  (
    SELECT COUNT(*)
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    AND dm.is_read = false
    AND dm.sender_id != auth.uid()
  ) as unread_count
FROM public.conversations c
JOIN public.profiles sp ON c.student_id = sp.id
JOIN public.profiles tp ON c.teacher_id = tp.id;

-- Drop and recreate student_teachers_with_whatsapp view with SECURITY INVOKER
DROP VIEW IF EXISTS public.student_teachers_with_whatsapp;

CREATE VIEW public.student_teachers_with_whatsapp
WITH (security_invoker = true)
AS
SELECT DISTINCT
  p.id as teacher_id,
  p.full_name as teacher_name,
  p.avatar_url as teacher_avatar,
  c.id as course_id,
  c.title as course_name,
  c.whatsapp_link,
  ce.student_id
FROM public.profiles p
JOIN public.courses c ON p.id = c.teacher_id
JOIN public.course_enrollments ce ON c.id = ce.course_id
WHERE p.role = 'teacher';

-- Grant necessary permissions
GRANT SELECT ON public.conversations_with_details TO authenticated;
GRANT SELECT ON public.student_teachers_with_whatsapp TO authenticated;
