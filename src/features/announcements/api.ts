import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/features/community/api";

/**
 * Post a course announcement, optionally to one cohort. The database decides
 * who may post where (can_post_announcement). Before the 2026-11-26 migration
 * there is no cohort column: the announcement then goes to the whole course
 * with the cohort name in the title, as it always did, and `scoped` is false.
 */
export async function postAnnouncement(values: {
  teacherId: string; courseId: string | null; cohortId?: string | null; cohortName?: string | null; title: string; message: string;
}): Promise<{ scoped: boolean }> {
  const base = { teacher_id: values.teacherId, course_id: values.courseId, title: values.title.trim(), message: values.message.trim(), is_active: true };
  if (!values.cohortId) {
    const { error } = await supabase.from("teacher_announcements").insert(base);
    if (error) throw error;
    return { scoped: true };
  }
  const { error } = await supabase.from("teacher_announcements").insert({ ...base, cohort_id: values.cohortId });
  if (!error) return { scoped: true };
  if (!isMissingSchema(error)) throw error;
  const fallback = await supabase.from("teacher_announcements").insert({ ...base, title: `[${values.cohortName || ""}] ${base.title}` });
  if (fallback.error) throw fallback.error;
  return { scoped: false };
}

/** Cohorts of a course, for choosing an audience. */
export async function fetchCourseCohorts(courseId: string) {
  const { data } = await supabase.from("cohorts").select("id, name").eq("course_id", courseId).order("start_date", { ascending: false });
  return data || [];
}
