import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/submissionFiles";

export type WorkItem = {
  id: string;
  kind: "assignment" | "capstone";
  title: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  dueDate: string | null;
  submission: {
    id: string;
    submittedAt: string | null;
    grade: number | null;
    feedback: string | null;
    note: string | null;
  } | null;
};

export type WorkStatus = "todo" | "submitted" | "graded";

export function statusOf(item: WorkItem): WorkStatus {
  if (!item.submission) return "todo";
  return item.submission.grade === null ? "submitted" : "graded";
}

export function isOverdue(item: WorkItem, now = new Date()) {
  return !item.submission && Boolean(item.dueDate) && new Date(item.dueDate!) < now;
}

type LessonRow = {
  id: string; title: string; description: string | null; due_date?: string | null;
  course_chapters: { course_id: string; courses: { title: string } | null };
};

async function enrolledCourseIds(userId: string) {
  const { data, error } = await supabase.from("course_enrollments").select("course_id").eq("student_id", userId);
  if (error) throw error;
  return (data || []).map((row) => row.course_id);
}

/** Every assignment and capstone in the learner's courses, with their own submission. */
export async function fetchWorkItems(userId: string): Promise<WorkItem[]> {
  const courseIds = await enrolledCourseIds(userId);
  if (courseIds.length === 0) return [];

  const lessonQuery = (columns: string) => supabase.from("course_lessons")
    .select(`${columns}, course_chapters!inner ( course_id, courses ( title ) )`)
    .eq("content_type", "assignment").in("course_chapters.course_id", courseIds);

  // Lesson deadlines arrive with the 2026-11-12 migration; read without them if it is not applied.
  let lessons = await lessonQuery("id, title, description, due_date");
  if (lessons.error) lessons = await lessonQuery("id, title, description");
  if (lessons.error) throw lessons.error;

  const capstones = await supabase.from("capstone_projects")
    .select("id, title, description, due_date, course_id, courses ( title )").in("course_id", courseIds);
  if (capstones.error) throw capstones.error;

  const lessonRows = (lessons.data || []) as unknown as LessonRow[];
  const lessonIds = lessonRows.map((row) => row.id);
  const capstoneIds = (capstones.data || []).map((row) => row.id);

  const [lessonSubs, capstoneSubs] = await Promise.all([
    lessonIds.length
      ? supabase.from("assignment_submissions").select("id, lesson_id, submitted_at, grade, feedback, description")
        .eq("student_id", userId).in("lesson_id", lessonIds)
      : Promise.resolve({ data: [], error: null }),
    capstoneIds.length
      ? supabase.from("capstone_submissions").select("id, capstone_project_id, submitted_at, grade, feedback, description")
        .eq("student_id", userId).in("capstone_project_id", capstoneIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (lessonSubs.error) throw lessonSubs.error;
  if (capstoneSubs.error) throw capstoneSubs.error;

  const toSubmission = (row?: { id: string; submitted_at: string | null; grade: number | null; feedback: string | null; description: string | null }) =>
    row ? { id: row.id, submittedAt: row.submitted_at, grade: row.grade, feedback: row.feedback, note: row.description } : null;

  const items: WorkItem[] = [
    ...lessonRows.map((row) => ({
      id: row.id,
      kind: "assignment" as const,
      title: row.title,
      description: row.description,
      courseId: row.course_chapters.course_id,
      courseTitle: row.course_chapters.courses?.title || "",
      dueDate: row.due_date ?? null,
      submission: toSubmission((lessonSubs.data || []).find((sub) => sub.lesson_id === row.id)),
    })),
    ...(capstones.data || []).map((row) => ({
      id: row.id,
      kind: "capstone" as const,
      title: row.title,
      description: row.description,
      courseId: row.course_id,
      courseTitle: (row.courses as { title: string } | null)?.title || "",
      dueDate: row.due_date,
      submission: toSubmission((capstoneSubs.data || []).find((sub) => sub.capstone_project_id === row.id)),
    })),
  ];

  // Soonest deadline first; work without a deadline last.
  return items.sort((a, b) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });
}

/** Upload the file, then record (or replace) the learner's submission. */
export async function submitWork(item: WorkItem, userId: string, file: File, note: string) {
  const path = `capstone-submissions/${item.id}/${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const upload = await supabase.storage.from("lesson-files").upload(path, file, { cacheControl: "3600", upsert: false });
  if (upload.error) throw upload.error;

  const common = {
    student_id: userId,
    project_links: [upload.data.path],
    description: note.trim() || null,
    submitted_at: new Date().toISOString(),
  };
  const result = item.kind === "capstone"
    ? await supabase.from("capstone_submissions")
      .upsert({ ...common, capstone_project_id: item.id }, { onConflict: "capstone_project_id,student_id" })
    : await supabase.from("assignment_submissions")
      .upsert({ ...common, lesson_id: item.id }, { onConflict: "lesson_id,student_id" });
  if (result.error) throw result.error;
}

export type QuizResult = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  attempts: number;
  /** Best attempt, as a percentage. */
  best: number;
  passed: boolean;
  lastAttemptAt: string;
};

/** Best result per quiz across the learner's courses. */
export async function fetchQuizResults(userId: string): Promise<QuizResult[]> {
  const courseIds = await enrolledCourseIds(userId);
  if (courseIds.length === 0) return [];
  const lessons = await supabase.from("course_lessons")
    .select("id, title, course_chapters!inner ( course_id )")
    .eq("content_type", "quiz").in("course_chapters.course_id", courseIds);
  if (lessons.error) throw lessons.error;
  const rows = (lessons.data || []) as unknown as Array<{ id: string; title: string; course_chapters: { course_id: string } }>;
  if (rows.length === 0) return [];

  const attempts = await supabase.from("student_quiz_attempts")
    .select("lesson_id, score, total_points, passed, submitted_at")
    .eq("student_id", userId).in("lesson_id", rows.map((row) => row.id));
  if (attempts.error) throw attempts.error;

  const results: QuizResult[] = [];
  for (const lesson of rows) {
    const mine = (attempts.data || []).filter((attempt) => attempt.lesson_id === lesson.id);
    if (mine.length === 0) continue;
    const percents = mine.map((attempt) => (attempt.total_points > 0 ? (attempt.score / attempt.total_points) * 100 : 0));
    results.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.course_chapters.course_id,
      attempts: mine.length,
      best: Math.round(Math.max(...percents)),
      passed: mine.some((attempt) => attempt.passed),
      lastAttemptAt: mine.map((attempt) => attempt.submitted_at).sort().at(-1)!,
    });
  }
  return results;
}
