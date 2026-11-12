import { supabase } from "@/integrations/supabase/client";

// Columns and functions added by the 2026-11-12 migrations are not in the
// generated types yet; they are read through this loosely typed handle and
// every such read tolerates the column being absent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export type LessonType = "video" | "pdf" | "document" | "url" | "quiz" | "assignment";

export type OutlineLesson = {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  contentUrl: string | null;
  fileUrl: string | null;
  duration: number | null;
  order: number;
  isPreview: boolean;
  isMandatory: boolean;
  dueDate: string | null;
  completed: boolean;
  started: boolean;
  lastPosition: number;
};

export type OutlineChapter = {
  id: string;
  title: string;
  order: number;
  isPreview: boolean;
  lessons: OutlineLesson[];
};

export type EnrolledCourse = {
  enrollmentId: string;
  courseId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  teacherName: string | null;
  mode: string | null;
  duration: string | null;
  cohortName: string | null;
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  completed: boolean;
  lastActivityAt: string | null;
  /** The lesson to open next: where the learner stopped, or the first unfinished one. */
  resumeLesson: { id: string; title: string; type: LessonType; chapterTitle: string } | null;
  startsAt: string | null;
  endsAt: string | null;
};

type RawLesson = {
  id: string; title: string; description?: string | null; content_type: string; content_url?: string | null;
  file_url?: string | null; duration?: number | null; order_index: number; is_preview?: boolean | null;
  is_mandatory?: boolean | null; due_date?: string | null;
};
type RawChapter = { id: string; course_id: string; title: string; order_index: number; is_preview?: boolean | null; course_lessons: RawLesson[] | null };
type ProgressRow = { lesson_id: string; is_completed: boolean | null; last_position: number | null };

function buildChapters(raw: RawChapter[], progress: Map<string, ProgressRow>): OutlineChapter[] {
  return [...raw]
    .sort((a, b) => a.order_index - b.order_index)
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order_index,
      isPreview: Boolean(chapter.is_preview),
      lessons: [...(chapter.course_lessons || [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => {
          const row = progress.get(lesson.id);
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description ?? null,
            type: lesson.content_type as LessonType,
            contentUrl: lesson.content_url || null,
            fileUrl: lesson.file_url || null,
            duration: lesson.duration ?? null,
            order: lesson.order_index,
            isPreview: Boolean(lesson.is_preview),
            isMandatory: Boolean(lesson.is_mandatory),
            dueDate: lesson.due_date ?? null,
            completed: Boolean(row?.is_completed),
            started: Boolean(row),
            lastPosition: row?.last_position || 0,
          };
        }),
    }));
}

async function loadProgress(studentId: string): Promise<Map<string, ProgressRow>> {
  const { data, error } = await supabase
    .from("student_lesson_progress")
    .select("lesson_id, is_completed, last_position")
    .eq("student_id", studentId);
  if (error) throw error;
  return new Map((data || []).map((row) => [row.lesson_id, row]));
}

export function flattenLessons(chapters: OutlineChapter[]) {
  return chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ ...lesson, chapterId: chapter.id, chapterTitle: chapter.title })));
}

/** Everything the learner is enrolled in, with real progress and the resume point. */
export async function fetchEnrolledCourses(studentId: string): Promise<EnrolledCourse[]> {
  const { data: enrollments, error } = await supabase
    .from("course_enrollments")
    .select(`id, course_id, enrolled_at, completed, cohort_name,
             courses ( id, title, description, thumbnail_url, mode, duration, teacher_id, profiles ( full_name ) )`)
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  const rows = (enrollments || []).filter((row) => row.courses);
  if (rows.length === 0) return [];
  const courseIds = rows.map((row) => row.course_id);

  const [chaptersResult, progress, resumeResult, cohortsResult] = await Promise.all([
    supabase.from("course_chapters")
      .select("id, course_id, title, order_index, is_preview, course_lessons ( id, title, content_type, order_index, duration )")
      .in("course_id", courseIds),
    loadProgress(studentId),
    db.from("course_enrollments").select("course_id, last_lesson_id, last_activity_at").eq("student_id", studentId),
    supabase.from("cohorts").select("course_id, name, start_date, end_date").in("course_id", courseIds),
  ]);
  if (chaptersResult.error) throw chaptersResult.error;

  const resumeByCourse = new Map<string, { last_lesson_id: string | null; last_activity_at: string | null }>(
    ((resumeResult.data as Array<{ course_id: string; last_lesson_id: string | null; last_activity_at: string | null }> | null) || [])
      .map((row) => [row.course_id, row]),
  );

  return rows.map((row) => {
    const course = row.courses!;
    const chapters = buildChapters(
      ((chaptersResult.data || []) as unknown as RawChapter[]).filter((chapter) => chapter.course_id === row.course_id),
      progress,
    );
    const lessons = flattenLessons(chapters);
    const done = lessons.filter((lesson) => lesson.completed).length;
    const resume = resumeByCourse.get(row.course_id);
    const last = lessons.find((lesson) => lesson.id === resume?.last_lesson_id);
    const next = (last && !last.completed ? last : undefined) || lessons.find((lesson) => !lesson.completed) || null;
    const cohort = (cohortsResult.data || []).find((c) => c.course_id === row.course_id && c.name === row.cohort_name);
    const teacher = course.profiles as { full_name: string | null } | null;
    return {
      enrollmentId: row.id,
      courseId: row.course_id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      teacherName: teacher?.full_name ?? null,
      mode: course.mode,
      duration: course.duration,
      cohortName: row.cohort_name,
      enrolledAt: row.enrolled_at,
      totalLessons: lessons.length,
      completedLessons: done,
      progress: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
      completed: Boolean(row.completed) || (lessons.length > 0 && done === lessons.length),
      lastActivityAt: resume?.last_activity_at ?? null,
      resumeLesson: next ? { id: next.id, title: next.title, type: next.type, chapterTitle: next.chapterTitle } : null,
      startsAt: cohort?.start_date ?? null,
      endsAt: cohort?.end_date ?? null,
    };
  });
}

export type CourseOutline = {
  course: {
    id: string; title: string; description: string | null; thumbnailUrl: string | null; teacherId: string;
    isFree: boolean; welcomeVideoUrl: string | null; whatsappLink: string | null;
  };
  teacher: { id: string; name: string | null; avatarUrl: string | null } | null;
  chapters: OutlineChapter[];
  capstone: { id: string; title: string; dueDate: string | null } | null;
  enrolled: boolean;
  lastLessonId: string | null;
};

/** The learning room's data: the course, its curriculum and this learner's progress. */
export async function fetchCourseOutline(courseId: string, userId: string): Promise<CourseOutline> {
  const [courseResult, chaptersResult, progress, enrollmentResult, capstoneResult, resumeResult, dueResult] = await Promise.all([
    supabase.from("courses")
      .select("id, title, description, thumbnail_url, teacher_id, is_free, welcome_video_url, whatsapp_group_link")
      .eq("id", courseId).single(),
    supabase.from("course_chapters")
      .select(`id, course_id, title, order_index, is_preview,
               course_lessons ( id, title, description, content_type, content_url, file_url, duration, order_index, is_preview, is_mandatory )`)
      .eq("course_id", courseId),
    loadProgress(userId),
    supabase.from("course_enrollments").select("id").eq("course_id", courseId).eq("student_id", userId).maybeSingle(),
    supabase.from("capstone_projects").select("id, title, due_date").eq("course_id", courseId).maybeSingle(),
    db.from("course_enrollments").select("last_lesson_id").eq("course_id", courseId).eq("student_id", userId).maybeSingle(),
    db.from("course_lessons").select("id, due_date, course_chapters!inner(course_id)").eq("course_chapters.course_id", courseId).not("due_date", "is", null),
  ]);
  if (courseResult.error) throw courseResult.error;
  if (chaptersResult.error) throw chaptersResult.error;
  const course = courseResult.data;

  const { data: teacher } = await supabase
    .from("profiles").select("id, full_name, avatar_url").eq("id", course.teacher_id).maybeSingle();

  const dueByLesson = new Map<string, string>(
    ((dueResult.data as Array<{ id: string; due_date: string }> | null) || []).map((row) => [row.id, row.due_date]),
  );
  const rawChapters = ((chaptersResult.data || []) as unknown as RawChapter[]).map((chapter) => ({
    ...chapter,
    course_lessons: (chapter.course_lessons || []).map((lesson) => ({ ...lesson, due_date: dueByLesson.get(lesson.id) ?? null })),
  }));

  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      teacherId: course.teacher_id,
      isFree: course.is_free !== false,
      welcomeVideoUrl: course.welcome_video_url,
      whatsappLink: course.whatsapp_group_link,
    },
    teacher: teacher ? { id: teacher.id, name: teacher.full_name, avatarUrl: teacher.avatar_url } : null,
    chapters: buildChapters(rawChapters, progress),
    capstone: capstoneResult.data ? { id: capstoneResult.data.id, title: capstoneResult.data.title, dueDate: capstoneResult.data.due_date } : null,
    enrolled: Boolean(enrollmentResult.data),
    lastLessonId: (resumeResult.data as { last_lesson_id: string | null } | null)?.last_lesson_id ?? null,
  };
}

/** Remember where the learner is. Never changes completion. */
export async function recordLessonVisit(lessonId: string, position?: number) {
  const { error } = await db.rpc("record_lesson_visit", { p_lesson_id: lessonId, p_position: position ?? null });
  if (error) console.warn("record_lesson_visit unavailable:", error.message);
}

export async function setLessonCompleted(studentId: string, lessonId: string, completed: boolean) {
  const { error } = await supabase.from("student_lesson_progress").upsert(
    { student_id: studentId, lesson_id: lessonId, is_completed: completed, completed_at: completed ? new Date().toISOString() : null },
    { onConflict: "student_id,lesson_id" },
  );
  if (error) throw error;
}

/** Turns a stored lesson file reference into a URL the browser can open. */
export async function resolveLessonFileUrl(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\/+/, "").replace(/^lesson-files\//, "");
  const { data, error } = await supabase.storage.from("lesson-files").createSignedUrl(path, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  return supabase.storage.from("lesson-files").getPublicUrl(path).data?.publicUrl || null;
}

export type TeacherAnnouncement = { id: string; title: string; message: string; createdAt: string; courseTitle: string | null };

export async function fetchCourseAnnouncements(limit = 4): Promise<TeacherAnnouncement[]> {
  const { data, error } = await supabase
    .from("teacher_announcements")
    .select("id, title, message, created_at, courses ( title )")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at || new Date().toISOString(),
    courseTitle: (row.courses as { title: string } | null)?.title ?? null,
  }));
}
