import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { isMissingSchema } from "@/features/community/api";
import { parseRubric, parseScores, type Rubric, type RubricScores } from "@/features/rubrics/rubric";

/**
 * Facilitation: an account assigned to a course (every cohort) or to one
 * cohort. Rights come from the assignment, enforced by the database
 * (20261125000000_facilitators.sql); this module only reads what RLS allows
 * and narrows it again on the client so demo mode behaves the same.
 */
export type Assignment = {
  id: string;
  courseId: string;
  courseTitle: string;
  cohortId: string | null;
  cohortName: string | null;
  cohortDiscordUrl: string | null;
};

export type RosterEntry = {
  courseId: string; studentId: string; fullName: string; avatarUrl: string | null; cohortName: string | null;
  progress: number; completed: boolean; lastActivityAt: string | null;
};

export async function fetchMyAssignments(userId: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("course_staff").select("id, course_id, cohort_id").eq("user_id", userId);
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  if (!data?.length) return [];
  const courseIds = Array.from(new Set(data.map((row) => row.course_id)));
  const cohortIds = data.map((row) => row.cohort_id).filter(Boolean) as string[];
  const [courses, cohorts] = await Promise.all([
    supabase.from("courses").select("id, title").in("id", courseIds),
    cohortIds.length ? supabase.from("cohorts").select("id, name, discord_url").in("id", cohortIds) : Promise.resolve({ data: [], error: null }),
  ]);
  return data.map((row) => {
    const cohort = (cohorts.data || []).find((item) => item.id === row.cohort_id) as { name: string; discord_url?: string | null } | undefined;
    return {
      id: row.id,
      courseId: row.course_id,
      courseTitle: (courses.data || []).find((item) => item.id === row.course_id)?.title || "",
      cohortId: row.cohort_id,
      cohortName: cohort?.name ?? null,
      cohortDiscordUrl: cohort?.discord_url ?? null,
    };
  });
}

export function useMyAssignments() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["my-facilitation", user?.id],
    queryFn: () => fetchMyAssignments(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  });
}

/** Learners the database says this user facilitates (names only, no contact details). */
export function useRoster() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["facilitation-roster", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RosterEntry[]> => {
      const { data, error } = await supabase.rpc("get_facilitated_learners");
      if (error) {
        if (isMissingSchema(error) || error.code === "PGRST202") return [];
        throw error;
      }
      return (data || []).map((row) => ({
        courseId: row.course_id, studentId: row.student_id, fullName: row.full_name || "", avatarUrl: row.avatar_url,
        cohortName: row.cohort_name, progress: Number(row.progress_percentage) || 0, completed: row.completed, lastActivityAt: row.last_activity_at,
      }));
    },
  });
}

export type QueueItem = {
  type: "assignment" | "capstone";
  id: string;
  courseId: string;
  itemTitle: string;
  rubric: Rubric | null;
  studentId: string;
  submittedAt: string | null;
  note: string | null;
  links: string[];
  fileUrl: string | null;
  grade: number | null;
  feedback: string | null;
  myReview: { suggestedGrade: number | null; notes: string | null; rubricScores: RubricScores; updatedAt: string } | null;
};

/** Submissions from assigned learners, with this user's provisional review if any. */
export async function fetchQueue(userId: string, roster: RosterEntry[]): Promise<QueueItem[]> {
  const courseIds = Array.from(new Set(roster.map((row) => row.courseId)));
  if (!courseIds.length) return [];
  const mine = new Set(roster.map((row) => `${row.courseId}:${row.studentId}`));

  const lessonQuery = (columns: string) => supabase.from("course_lessons")
    .select(`${columns}, course_chapters!inner ( course_id )`).eq("content_type", "assignment").in("course_chapters.course_id", courseIds);
  let lessons = await lessonQuery("id, title, rubric");
  if (lessons.error) lessons = await lessonQuery("id, title");
  const lessonRows = (lessons.data || []) as unknown as { id: string; title: string; rubric?: unknown; course_chapters: { course_id: string } }[];
  let capstones = await supabase.from("capstone_projects").select("id, title, course_id, rubric").in("course_id", courseIds);
  if (capstones.error) capstones = await supabase.from("capstone_projects").select("id, title, course_id").in("course_id", courseIds) as typeof capstones;
  const capstoneRows = (capstones.data || []) as { id: string; title: string; course_id: string; rubric?: unknown }[];

  const [assignmentSubs, capstoneSubs, reviews] = await Promise.all([
    lessonRows.length
      ? supabase.from("assignment_submissions").select("id, lesson_id, student_id, submitted_at, description, project_links, grade, feedback").in("lesson_id", lessonRows.map((row) => row.id))
      : Promise.resolve({ data: [], error: null }),
    capstoneRows.length
      ? supabase.from("capstone_submissions").select("id, capstone_project_id, student_id, submitted_at, description, project_links, file_url, grade, feedback").in("capstone_project_id", capstoneRows.map((row) => row.id))
      : Promise.resolve({ data: [], error: null }),
    supabase.from("submission_reviews").select("submission_type, submission_id, suggested_grade, notes, rubric_scores, updated_at").eq("reviewer_id", userId),
  ]);

  const reviewOf = (type: string, id: string) => {
    const row = (reviews.data || []).find((item) => item.submission_type === type && item.submission_id === id);
    return row ? { suggestedGrade: row.suggested_grade, notes: row.notes, rubricScores: parseScores(row.rubric_scores), updatedAt: row.updated_at } : null;
  };

  const items: QueueItem[] = [
    ...(assignmentSubs.data || []).map((row) => {
      const lesson = lessonRows.find((item) => item.id === row.lesson_id)!;
      return {
        type: "assignment" as const, id: row.id, courseId: lesson.course_chapters.course_id, itemTitle: lesson.title, rubric: parseRubric(lesson.rubric),
        studentId: row.student_id, submittedAt: row.submitted_at, note: row.description, links: row.project_links || [], fileUrl: null,
        grade: row.grade, feedback: row.feedback, myReview: reviewOf("assignment", row.id),
      };
    }),
    ...(capstoneSubs.data || []).map((row) => {
      const capstone = capstoneRows.find((item) => item.id === row.capstone_project_id)!;
      return {
        type: "capstone" as const, id: row.id, courseId: capstone.course_id, itemTitle: capstone.title, rubric: parseRubric(capstone.rubric),
        studentId: row.student_id, submittedAt: row.submitted_at, note: row.description, links: row.project_links || [], fileUrl: row.file_url,
        grade: row.grade, feedback: row.feedback, myReview: reviewOf("capstone", row.id),
      };
    }),
  ];
  return items
    .filter((item) => mine.has(`${item.courseId}:${item.studentId}`))
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
}

export async function saveReview(userId: string, item: Pick<QueueItem, "type" | "id">, values: { suggestedGrade: number | null; notes: string; rubricScores: RubricScores | null }) {
  const { error } = await supabase.from("submission_reviews").upsert({
    submission_type: item.type,
    submission_id: item.id,
    reviewer_id: userId,
    suggested_grade: values.suggestedGrade,
    notes: values.notes.trim() || null,
    rubric_scores: (values.rubricScores as never) ?? null,
  }, { onConflict: "submission_type,submission_id,reviewer_id" });
  if (error) throw error;
}

/** Provisional reviews for the instructor's grading queue, by submission id. */
export async function fetchReviewsForInstructor(type: "assignment" | "capstone", submissionIds: string[]) {
  if (!submissionIds.length) return new Map<string, { suggestedGrade: number | null; notes: string | null; rubricScores: RubricScores; reviewerName: string }>();
  const { data, error } = await supabase.from("submission_reviews")
    .select("submission_id, suggested_grade, notes, rubric_scores, reviewer_id, updated_at")
    .eq("submission_type", type).in("submission_id", submissionIds).order("updated_at", { ascending: false });
  if (error) return new Map();
  const reviewerIds = Array.from(new Set((data || []).map((row) => row.reviewer_id)));
  const names = reviewerIds.length ? (await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)).data || [] : [];
  const map = new Map<string, { suggestedGrade: number | null; notes: string | null; rubricScores: RubricScores; reviewerName: string }>();
  for (const row of data || []) {
    if (map.has(row.submission_id)) continue;
    map.set(row.submission_id, {
      suggestedGrade: row.suggested_grade, notes: row.notes, rubricScores: parseScores(row.rubric_scores),
      reviewerName: names.find((person) => person.id === row.reviewer_id)?.full_name || "",
    });
  }
  return map;
}
