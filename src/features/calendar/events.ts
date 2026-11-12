import { supabase } from "@/integrations/supabase/client";
import { db } from "@/features/learning/api";
import type { AppRole } from "@/components/shell/navigation";

export type CalendarEventKind = "session" | "assignment" | "capstone" | "cohort_start" | "cohort_end";

/**
 * One event shape for every calendar in the product. Events are never stored
 * separately: each one is read from the record that owns the date (a session,
 * an assignment lesson, a capstone, a cohort), so it cannot disagree with it.
 */
export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  modality: "online" | "in_person" | "hybrid" | null;
  location: string | null;
  link: string | null;
  cancelled: boolean;
  description: string | null;
  /** Where to go from the event. */
  href: string | null;
  cohortName?: string | null;
  teacherId?: string | null;
};

type Scope = { role: AppRole; userId: string };

async function courseScope({ role, userId }: Scope): Promise<{ ids: string[] | null; titles: Map<string, string> }> {
  const titles = new Map<string, string>();
  if (role === "admin") {
    const { data } = await supabase.from("courses").select("id, title");
    (data || []).forEach((course) => titles.set(course.id, course.title));
    return { ids: null, titles };
  }
  if (role === "teacher") {
    const { data } = await supabase.from("courses").select("id, title").eq("teacher_id", userId);
    (data || []).forEach((course) => titles.set(course.id, course.title));
    return { ids: [...titles.keys()], titles };
  }
  const { data } = await supabase.from("course_enrollments").select("course_id, courses ( title )").eq("student_id", userId);
  (data || []).forEach((row) => titles.set(row.course_id, (row.courses as { title: string } | null)?.title || ""));
  return { ids: [...titles.keys()], titles };
}

export async function fetchCalendarEvents(scope: Scope, from: Date, to: Date): Promise<CalendarEvent[]> {
  const { ids, titles } = await courseScope(scope);
  if (ids && ids.length === 0) return [];
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inCourses = (query: any, column = "course_id") => (ids ? query.in(column, ids) : query);

  const learnerPrefix = scope.role === "student" ? "/learn" : "/course";

  const [sessions, capstones, assignments, cohorts] = await Promise.all([
    inCourses(db.from("scheduled_classes").select("*").gte("scheduled_time", fromIso).lte("scheduled_time", toIso)),
    inCourses(db.from("capstone_projects").select("id, title, due_date, course_id").gte("due_date", fromIso).lte("due_date", toIso)),
    inCourses(
      db.from("course_lessons")
        .select("id, title, due_date, course_chapters!inner ( course_id )")
        .eq("content_type", "assignment").gte("due_date", fromIso).lte("due_date", toIso),
      "course_chapters.course_id",
    ),
    inCourses(db.from("cohorts").select("id, name, course_id, start_date, end_date, teacher_id").eq("is_active", true)),
  ]);

  const events: CalendarEvent[] = [];

  for (const row of (sessions.data as Array<Record<string, string | null>> | null) || []) {
    const start = new Date(row.scheduled_time as string);
    events.push({
      id: `session-${row.id}`,
      kind: "session",
      title: row.title as string,
      courseId: row.course_id,
      courseTitle: titles.get(row.course_id || "") || null,
      start,
      // Sessions created before end times existed were always shown as one hour.
      end: row.end_time ? new Date(row.end_time) : new Date(start.getTime() + 60 * 60_000),
      allDay: false,
      modality: (row.modality as CalendarEvent["modality"]) || (row.meet_link ? "online" : null),
      location: row.location || null,
      link: row.meet_link || null,
      cancelled: row.status === "cancelled",
      description: row.description || null,
      href: row.course_id ? `${learnerPrefix}/${row.course_id}` : null,
      teacherId: row.teacher_id,
    });
  }

  for (const row of (capstones.data as Array<{ id: string; title: string; due_date: string | null; course_id: string }> | null) || []) {
    if (!row.due_date) continue;
    events.push({
      id: `capstone-${row.id}`, kind: "capstone", title: row.title, courseId: row.course_id,
      courseTitle: titles.get(row.course_id) || null, start: new Date(row.due_date), end: null, allDay: false,
      modality: null, location: null, link: null, cancelled: false, description: null,
      href: scope.role === "student" ? `/learn/${row.course_id}?capstone=1` : "/teacher/assignments",
    });
  }

  for (const row of (assignments.data as Array<{ id: string; title: string; due_date: string; course_chapters: { course_id: string } }> | null) || []) {
    const courseId = row.course_chapters?.course_id;
    events.push({
      id: `assignment-${row.id}`, kind: "assignment", title: row.title, courseId,
      courseTitle: titles.get(courseId) || null, start: new Date(row.due_date), end: null, allDay: false,
      modality: null, location: null, link: null, cancelled: false, description: null,
      href: scope.role === "student" ? `/learn/${courseId}/${row.id}` : "/teacher/assignments",
    });
  }

  for (const row of (cohorts.data as Array<{ id: string; name: string; course_id: string | null; start_date: string | null; end_date: string | null; teacher_id: string }> | null) || []) {
    const base = {
      courseId: row.course_id, courseTitle: titles.get(row.course_id || "") || null, end: null, allDay: true,
      modality: null, location: null, link: null, cancelled: false, description: null, cohortName: row.name,
      href: row.course_id ? `${learnerPrefix}/${row.course_id}` : null, teacherId: row.teacher_id,
    };
    if (row.start_date && row.start_date >= fromIso && row.start_date <= toIso) {
      events.push({ ...base, id: `cohort-start-${row.id}`, kind: "cohort_start", title: row.name, start: new Date(row.start_date) });
    }
    if (row.end_date && row.end_date >= fromIso && row.end_date <= toIso) {
      events.push({ ...base, id: `cohort-end-${row.id}`, kind: "cohort_end", title: row.name, start: new Date(row.end_date) });
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Sessions that overlap for the same teacher: the conflicts an admin needs to see. */
export function findConflicts(events: CalendarEvent[]): Set<string> {
  const conflicted = new Set<string>();
  const sessions = events.filter((event) => event.kind === "session" && !event.cancelled && event.end);
  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      if (b.start >= a.end!) break;
      const sameTeacher = a.teacherId && a.teacherId === b.teacherId;
      const sameRoom = a.location && b.location && a.location.trim().toLowerCase() === b.location.trim().toLowerCase();
      if ((sameTeacher || sameRoom) && a.start < b.end! && b.start < a.end!) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}
