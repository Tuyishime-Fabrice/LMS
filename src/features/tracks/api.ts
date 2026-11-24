import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { isMissingSchema } from "@/features/community/api";
import { trackProgress, type TrackProgress } from "./progress";

export type TrackRow = Database["public"]["Tables"]["learning_paths"]["Row"];
export type TrackCourse = {
  id: string; title: string; summary: string | null; thumbnailUrl: string | null; level: string | null;
  duration: string | null; isFree: boolean; price: number; currency: string;
};
export type Track = TrackRow & {
  items: { courseId: string; position: number; required: boolean; milestone: string | null; course: TrackCourse | null }[];
};

/** Published tracks (all tracks for admins), with their courses in order. `available` is false before the migration. */
export async function fetchTracks(): Promise<{ available: boolean; tracks: Track[] }> {
  const { data: paths, error } = await supabase.from("learning_paths").select("*")
    .order("display_order", { ascending: true }).order("title", { ascending: true });
  if (error) {
    if (isMissingSchema(error)) return { available: false, tracks: [] };
    throw error;
  }
  if (!paths?.length) return { available: true, tracks: [] };

  const { data: items, error: itemsError } = await supabase.from("learning_path_items")
    .select("path_id, course_id, position, is_required, milestone").in("path_id", paths.map((path) => path.id));
  if (itemsError) throw itemsError;

  const courseIds = Array.from(new Set((items || []).map((item) => item.course_id)));
  const { data: courses } = courseIds.length
    ? await supabase.from("courses").select("id, title, summary, description, thumbnail_url, level, duration, is_free, price, currency").in("id", courseIds)
    : { data: [] as never[] };
  const courseById = new Map((courses || []).map((row) => [row.id, {
    id: row.id, title: row.title, summary: row.summary || row.description, thumbnailUrl: row.thumbnail_url, level: row.level,
    duration: row.duration, isFree: row.is_free === true || !Number(row.price), price: Number(row.price) || 0, currency: row.currency || "RWF",
  } satisfies TrackCourse]));

  return {
    available: true,
    tracks: paths.map((path) => ({
      ...path,
      items: (items || []).filter((item) => item.path_id === path.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ courseId: item.course_id, position: item.position, required: item.is_required, milestone: item.milestone, course: courseById.get(item.course_id) || null }))
        // A course that is not readable (unpublished) is not shown to learners.
        .filter((item) => item.course),
    })),
  };
}

export function useTracks() {
  return useQuery({ queryKey: ["tracks"], queryFn: fetchTracks, staleTime: 5 * 60_000 });
}

/** The signed-in learner's enrolments, for track progress. Empty for visitors and staff. */
export function useMyEnrolments() {
  const { user, profile } = useAppAuth();
  return useQuery({
    queryKey: ["my-enrolments-lite", user?.id],
    enabled: Boolean(user?.id && profile?.role === "student"),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("course_enrollments")
        .select("course_id, completed, progress_percentage").eq("student_id", user!.id);
      if (error) throw error;
      return (data || []).map((row) => ({ courseId: row.course_id, completed: Boolean(row.completed), progress: Number(row.progress_percentage) || 0 }));
    },
  });
}

export function progressFor(track: Track, enrolments: { courseId: string; completed: boolean; progress: number }[] | undefined): TrackProgress {
  return trackProgress(track.items.map((item) => ({ courseId: item.courseId, position: item.position, required: item.required })), enrolments || []);
}
