import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isMissingSchema } from "@/features/community/api";
import { parseRubric, type Rubric } from "@/features/rubrics/rubric";

/**
 * Assignment drafts written by facilitators. The database guards every
 * transition (guard_assignment_draft): authors move draft ↔ submitted while
 * undecided; only the instructor's approve/return functions decide.
 */
type Row = Database["public"]["Tables"]["assignment_drafts"]["Row"];
export type DraftStatus = Row["status"];
export type Draft = Omit<Row, "rubric"> & { rubric: Rubric | null; courseTitle: string; chapterTitle: string; authorName: string };
export type DraftInput = { courseId: string; chapterId: string; title: string; instructions: string; dueDate: string | null; rubric: Rubric | null };

async function decorate(rows: Row[]): Promise<Draft[]> {
  const courseIds = Array.from(new Set(rows.map((row) => row.course_id)));
  const chapterIds = Array.from(new Set(rows.map((row) => row.chapter_id)));
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));
  const [courses, chapters, people] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    chapterIds.length ? supabase.from("course_chapters").select("id, title").in("id", chapterIds) : Promise.resolve({ data: [] }),
    authorIds.length ? supabase.from("profiles").select("id, full_name").in("id", authorIds) : Promise.resolve({ data: [] }),
  ]);
  return rows.map((row) => ({
    ...row,
    rubric: parseRubric(row.rubric),
    courseTitle: (courses.data || []).find((item) => item.id === row.course_id)?.title || "",
    chapterTitle: (chapters.data || []).find((item) => item.id === row.chapter_id)?.title || "",
    authorName: (people.data || []).find((item) => item.id === row.author_id)?.full_name || "",
  }));
}

/** `available` is false until the 2026-11-26 migration is applied. */
export async function fetchMyDrafts(userId: string): Promise<{ available: boolean; drafts: Draft[] }> {
  const { data, error } = await supabase.from("assignment_drafts").select("*").eq("author_id", userId).order("updated_at", { ascending: false });
  if (error) {
    if (isMissingSchema(error)) return { available: false, drafts: [] };
    throw error;
  }
  return { available: true, drafts: await decorate(data || []) };
}

/** Drafts on a course, for its instructor: waiting ones first. */
export async function fetchCourseDrafts(courseId: string): Promise<Draft[]> {
  const { data, error } = await supabase.from("assignment_drafts").select("*").eq("course_id", courseId).in("status", ["submitted", "changes_requested"])
    .order("submitted_at", { ascending: true });
  if (error) return [];
  return decorate(data || []);
}

export async function fetchModules(courseId: string) {
  const { data } = await supabase.from("course_chapters").select("id, title, order_index").eq("course_id", courseId).order("order_index");
  return data || [];
}

export async function saveDraft(id: string | null, input: DraftInput, submit: boolean, authorId: string) {
  const row = {
    course_id: input.courseId, chapter_id: input.chapterId, title: input.title.trim(), instructions: input.instructions.trim() || null,
    due_date: input.dueDate, rubric: (input.rubric as never) ?? null, status: (submit ? "submitted" : "draft") as DraftStatus,
  };
  // author_id is also forced to the caller by the database (guard_assignment_draft).
  const { error } = id ? await supabase.from("assignment_drafts").update(row).eq("id", id) : await supabase.from("assignment_drafts").insert({ ...row, author_id: authorId });
  if (error) throw error;
}

export async function deleteDraft(id: string) {
  const { error } = await supabase.from("assignment_drafts").delete().eq("id", id);
  if (error) throw error;
}

export async function approveDraft(id: string) {
  const { data, error } = await supabase.rpc("approve_assignment_draft", { p_draft_id: id });
  if (error) throw error;
  return data;
}

export async function returnDraft(id: string, note: string) {
  const { error } = await supabase.rpc("return_assignment_draft", { p_draft_id: id, p_note: note });
  if (error) throw error;
}
