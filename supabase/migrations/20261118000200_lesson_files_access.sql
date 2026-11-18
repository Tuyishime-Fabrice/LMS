-- Lesson files follow the same rule as lessons.
--
-- Before this, anyone (even signed out) could read every file in the lesson-files bucket except
-- student submissions, anyone enrolled in any course could read all of them, and any account
-- with the teacher role (which anyone can choose at sign-up) could read, replace or delete every
-- file, student submissions included.
--
-- Now:
--   course material  readable by whoever may open the lesson (enrolled, free course, preview,
--                    the course's teacher, admins); see public.can_access_lesson
--   student work     (capstone-submissions/...) readable by the student, the teacher of that
--                    course and admins
--   uploads          approved teachers and admins upload course material; students upload only
--                    into their own submission folder (unchanged)
--   changes          the uploader, the course's teacher or an admin may replace or delete a file
-- Safe to run more than once.

-- Does a stored file reference (path, "lesson-files/path" or a full storage URL) point at this object?
CREATE OR REPLACE FUNCTION public.lesson_file_ref_matches(p_stored text, p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_stored IS NOT NULL AND p_name IS NOT NULL AND (
    ltrim(p_stored, '/') = p_name
    OR ltrim(p_stored, '/') = 'lesson-files/' || p_name
    OR right(split_part(p_stored, '?', 1), length(p_name) + 14) = '/lesson-files/' || p_name
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_lesson_file(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dirs text[] := storage.foldername(p_name);
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF v_uid IS NOT NULL AND public.is_admin(v_uid) THEN
    RETURN true;
  END IF;

  -- Student work: capstone-submissions/<capstone or lesson id>/<student id>/<file>
  IF v_dirs[1] = 'capstone-submissions' THEN
    IF v_uid IS NULL THEN
      RETURN false;
    END IF;
    IF v_dirs[3] = v_uid::text OR v_dirs[2] = v_uid::text THEN
      RETURN true;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.capstone_projects p JOIN public.courses c ON c.id = p.course_id
      WHERE c.teacher_id = v_uid AND (
        (coalesce(v_dirs[2], '') ~ v_uuid AND p.id = v_dirs[2]::uuid)
        OR EXISTS (SELECT 1 FROM public.capstone_submissions s
                   WHERE s.capstone_project_id = p.id AND public.lesson_file_ref_matches(s.file_url, p_name))
      )
    ) OR EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_chapters ch ON ch.id = l.chapter_id
      JOIN public.courses c ON c.id = ch.course_id
      WHERE c.teacher_id = v_uid AND coalesce(v_dirs[2], '') ~ v_uuid AND l.id = v_dirs[2]::uuid
    );
  END IF;

  -- Course material: a lesson that uses the file (or <course id>/<lesson id>/<file>).
  IF EXISTS (
    SELECT 1 FROM public.course_lessons l
    WHERE (public.lesson_file_ref_matches(l.file_url, p_name)
           OR public.lesson_file_ref_matches(l.content_url, p_name)
           OR (coalesce(v_dirs[2], '') ~ v_uuid AND l.id = v_dirs[2]::uuid))
      AND public.can_access_lesson(l.id)
  ) THEN
    RETURN true;
  END IF;

  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Course-wide files (materials, capstone briefs) for enrolled learners and the course's teacher,
  -- and everything in a teacher's own course folder.
  RETURN EXISTS (
    SELECT 1 FROM public.courses c
    WHERE (c.teacher_id = v_uid
           OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id = c.id AND e.student_id = v_uid))
      AND (
        EXISTS (SELECT 1 FROM public.course_materials m
                WHERE m.course_id = c.id AND public.lesson_file_ref_matches(m.file_url, p_name))
        OR EXISTS (SELECT 1 FROM public.capstone_projects p
                   WHERE p.course_id = c.id AND public.lesson_file_ref_matches(p.file_url, p_name))
        OR (c.teacher_id = v_uid AND coalesce(v_dirs[1], '') ~ v_uuid AND c.id = v_dirs[1]::uuid)
      )
  );
END;
$$;

-- May this user replace or delete the file? Admins, and the teacher of the course it belongs to.
CREATE OR REPLACE FUNCTION public.can_manage_lesson_file(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_dirs text[] := storage.foldername(p_name);
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_admin(v_uid) THEN
    RETURN true;
  END IF;
  IF v_dirs[1] = 'capstone-submissions' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.teacher_id = v_uid AND (
      (coalesce(v_dirs[1], '') ~ v_uuid AND c.id = v_dirs[1]::uuid)
      OR EXISTS (SELECT 1 FROM public.course_chapters ch JOIN public.course_lessons l ON l.chapter_id = ch.id
                 WHERE ch.course_id = c.id
                   AND (public.lesson_file_ref_matches(l.file_url, p_name) OR public.lesson_file_ref_matches(l.content_url, p_name)))
      OR EXISTS (SELECT 1 FROM public.course_materials m
                 WHERE m.course_id = c.id AND public.lesson_file_ref_matches(m.file_url, p_name))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_read_lesson_file(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_lesson_file(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_lesson_file(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_file(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Public can view lesson content files" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can download lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view all lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their lesson files" ON storage.objects;

DROP POLICY IF EXISTS "Lesson files follow lesson access" ON storage.objects;
CREATE POLICY "Lesson files follow lesson access" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'lesson-files' AND (owner_id = (auth.uid())::text OR public.can_read_lesson_file(name)));

DROP POLICY IF EXISTS "Approved teachers and admins upload lesson files" ON storage.objects;
CREATE POLICY "Approved teachers and admins upload lesson files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND coalesce((storage.foldername(name))[1], '') <> 'capstone-submissions'
    AND EXISTS (SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (p.role = 'admin' OR (p.role = 'teacher' AND coalesce(p.teacher_approved, false))))
  );

DROP POLICY IF EXISTS "Uploader or course teacher can replace lesson files" ON storage.objects;
CREATE POLICY "Uploader or course teacher can replace lesson files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-files' AND (owner_id = (auth.uid())::text OR public.can_manage_lesson_file(name)));

DROP POLICY IF EXISTS "Uploader or course teacher can delete lesson files" ON storage.objects;
CREATE POLICY "Uploader or course teacher can delete lesson files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-files' AND (owner_id = (auth.uid())::text OR public.can_manage_lesson_file(name)));
