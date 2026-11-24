import { supabase } from "@/integrations/supabase/client";
import { pickCommunityUrl } from "./discord";

export type CommunityLink = {
  courseId: string;
  courseTitle: string;
  cohortName: string | null;
  url: string | null;
  scope: "cohort" | "course" | null;
};

/** PostgREST error for a column or table that does not exist yet (migration not applied). */
export function isMissingSchema(error: { code?: string } | null | undefined) {
  return Boolean(error && ["42703", "42P01", "PGRST204", "PGRST205"].includes(error.code || ""));
}

/** One row per course the learner is enrolled in, with the Discord link to use. */
export async function fetchCommunityLinks(studentId: string): Promise<CommunityLink[]> {
  const { data: enrollments, error } = await supabase
    .from("course_enrollments")
    .select("course_id, cohort_id, cohort_name")
    .eq("student_id", studentId);
  if (error) throw error;
  if (!enrollments?.length) return [];

  const courseIds = Array.from(new Set(enrollments.map((row) => row.course_id)));
  const cohortIds = Array.from(new Set(enrollments.map((row) => row.cohort_id).filter(Boolean))) as string[];

  let courses = await supabase.from("courses").select("id, title, discord_url").in("id", courseIds);
  if (isMissingSchema(courses.error)) {
    courses = await supabase.from("courses").select("id, title").in("id", courseIds) as typeof courses;
  }
  if (courses.error) throw courses.error;

  let cohorts: { id: string; name: string; discord_url?: string | null }[] = [];
  if (cohortIds.length) {
    const result = await supabase.from("cohorts").select("id, name, discord_url").in("id", cohortIds);
    if (!result.error) cohorts = result.data || [];
    else if (!isMissingSchema(result.error)) throw result.error;
  }

  return enrollments.map((row) => {
    const course = (courses.data || []).find((item) => item.id === row.course_id) as { id: string; title: string; discord_url?: string | null } | undefined;
    const cohort = cohorts.find((item) => item.id === row.cohort_id);
    const picked = pickCommunityUrl(cohort?.discord_url, course?.discord_url);
    return {
      courseId: row.course_id,
      courseTitle: course?.title || "",
      cohortName: cohort?.name || row.cohort_name || null,
      url: picked?.url ?? null,
      scope: picked?.scope ?? null,
    };
  }).filter((row) => row.courseTitle);
}
