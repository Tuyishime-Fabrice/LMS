-- =====================================================================
-- Catalogue listing and verified project outcomes (2026-11-27)
--
-- Additive and idempotent. Apply by hand after the previous migrations.
--
--  1. courses.listed: an approved course appears in the public catalogue,
--     on the home page and in suggestions only while listed. An unlisted
--     course (for example a programme built for one client) still opens
--     from a direct link and for its enrolled learners. Only admins change
--     it; instructors cannot re-list a course themselves.
--  2. exhibition_projects.outcomes_verified: the public project page shows
--     scores, achievements and measured results only once an admin has
--     checked them.
-- =====================================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.courses.listed IS 'Shown in the public catalogue. False for client-only programmes; the course still opens from a direct link.';

CREATE OR REPLACE FUNCTION public.protect_course_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.listed IS DISTINCT FROM OLD.listed AND NOT public.is_privileged_context() THEN
    NEW.listed := OLD.listed;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_course_listing ON public.courses;
CREATE TRIGGER protect_course_listing
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.protect_course_listing();

-- New courses from non-admins start listed (the default); only an admin can create one unlisted.
CREATE OR REPLACE FUNCTION public.default_course_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_privileged_context() THEN
    NEW.listed := true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS default_course_listing ON public.courses;
CREATE TRIGGER default_course_listing
  BEFORE INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.default_course_listing();

ALTER TABLE public.exhibition_projects ADD COLUMN IF NOT EXISTS outcomes_verified boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.exhibition_projects.outcomes_verified IS 'Scores, achievements and measured results are public only when true.';
