import { supabase } from "@/integrations/supabase/client";
import { buildJourney, type Journey, type JourneyInput } from "./journey";

export type CourseJourney = {
  course: { id: string; title: string; thumbnailUrl: string | null };
  cohortName: string | null;
  journey: Journey;
};

/** Every course this learner has applied to, paid for, or enrolled in, with its journey. */
export async function fetchJourneys(studentId: string): Promise<CourseJourney[]> {
  const [payments, applications, enrollments, certificates] = await Promise.all([
    supabase.from("payments").select("course_id, status, created_at, updated_at").eq("student_id", studentId).not("course_id", "is", null),
    supabase.from("cohort_join_requests").select("cohort_id, status, created_at, updated_at").eq("student_id", studentId),
    supabase.from("course_enrollments").select("course_id, enrolled_at, progress_percentage, completed, completion_date, cohort_name").eq("student_id", studentId),
    supabase.from("certificates").select("course_id, status, issued_at").eq("student_id", studentId),
  ]);
  for (const result of [payments, enrollments]) if (result.error) throw result.error;

  const cohortIds = Array.from(new Set((applications.data || []).map((row) => row.cohort_id)));
  const cohorts = cohortIds.length
    ? (await supabase.from("cohorts").select("id, name, course_id").in("id", cohortIds)).data || []
    : [];
  const cohortById = new Map(cohorts.map((row) => [row.id, row]));

  const courseIds = new Set<string>();
  (payments.data || []).forEach((row) => row.course_id && courseIds.add(row.course_id));
  (enrollments.data || []).forEach((row) => courseIds.add(row.course_id));
  (applications.data || []).forEach((row) => { const c = cohortById.get(row.cohort_id); if (c?.course_id) courseIds.add(c.course_id); });
  if (!courseIds.size) return [];

  const { data: courses, error } = await supabase.from("courses")
    .select("id, title, thumbnail_url, is_free, price").in("id", Array.from(courseIds));
  if (error) throw error;

  return (courses || []).map((course) => {
    const enrollment = (enrollments.data || []).find((row) => row.course_id === course.id);
    const application = (applications.data || [])
      .filter((row) => cohortById.get(row.cohort_id)?.course_id === course.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const certificate = (certificates.data || []).find((row) => row.course_id === course.id);
    const input: JourneyInput = {
      courseId: course.id,
      isFree: course.is_free === true || !Number(course.price),
      application: application ? { status: application.status, createdAt: application.created_at, updatedAt: application.updated_at } : null,
      payments: (payments.data || []).filter((row) => row.course_id === course.id)
        .map((row) => ({ status: row.status, createdAt: row.created_at, updatedAt: row.updated_at })),
      enrollment: enrollment ? {
        enrolledAt: enrollment.enrolled_at,
        progress: Number(enrollment.progress_percentage) || 0,
        completed: Boolean(enrollment.completed),
        completionDate: enrollment.completion_date,
      } : null,
      certificate: certificate ? { status: certificate.status, issuedAt: certificate.issued_at } : null,
    };
    return {
      course: { id: course.id, title: course.title, thumbnailUrl: course.thumbnail_url },
      cohortName: (application && cohortById.get(application.cohort_id)?.name) || enrollment?.cohort_name || null,
      journey: buildJourney(input),
    };
  });
}
