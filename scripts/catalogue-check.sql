-- Catalogue check: courses that are public but missing what the landing page and course page show.
-- Read-only. Paste into the Supabase SQL editor; it changes nothing.
-- Each row lists the problems for one approved, listed course. Fix them in the course editor, or
-- unlist the course in Admin > Courses until it is ready (needs 20261127000000_listing_and_verification.sql).
WITH c AS (
  SELECT co.*,
         (SELECT count(*) FROM public.course_chapters ch WHERE ch.course_id = co.id) AS modules,
         (SELECT count(*) FROM public.course_lessons l JOIN public.course_chapters ch ON ch.id = l.chapter_id
           WHERE ch.course_id = co.id) AS lessons
  FROM public.courses co
  WHERE co.approval_status = 'approved'
    AND COALESCE(co.listed, true)
)
SELECT id, title,
       array_remove(ARRAY[
         CASE WHEN COALESCE(trim(description), '') = '' OR length(description) < 80 THEN 'description missing or under 80 characters' END,
         CASE WHEN COALESCE(thumbnail_url, '') = '' THEN 'no cover image' END,
         CASE WHEN level IS NULL THEN 'no level' END,
         CASE WHEN language IS NULL THEN 'no teaching language' END,
         CASE WHEN category IS NULL THEN 'no category' END,
         CASE WHEN NOT COALESCE(is_free, false) AND COALESCE(price, 0) <= 0 THEN 'paid course without a price' END,
         CASE WHEN COALESCE(array_length(learning_outcomes, 1), 0) = 0 THEN 'no learning outcomes' END,
         CASE WHEN modules = 0 THEN 'no modules' END,
         CASE WHEN lessons = 0 THEN 'no lessons' END,
         CASE WHEN title ~* '(test|demo|sample|copy of|untitled)' THEN 'title looks like a test course' END,
         CASE WHEN early_bird_price IS NOT NULL AND early_bird_end IS NOT NULL AND early_bird_end < now() THEN 'early bird ended (fine, but check the course page wording)' END
       ], NULL) AS problems
FROM c
WHERE COALESCE(trim(description), '') = '' OR length(description) < 80
   OR COALESCE(thumbnail_url, '') = '' OR level IS NULL OR language IS NULL OR category IS NULL
   OR (NOT COALESCE(is_free, false) AND COALESCE(price, 0) <= 0)
   OR COALESCE(array_length(learning_outcomes, 1), 0) = 0
   OR modules = 0 OR lessons = 0
   OR title ~* '(test|demo|sample|copy of|untitled)'
ORDER BY title;
