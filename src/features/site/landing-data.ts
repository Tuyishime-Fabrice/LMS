import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/features/community/api";

export type LandingCourse = {
  id: string;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  level: string | null;
  duration: string | null;
  language: string | null;
  price: number;
  currency: string;
  isFree: boolean;
  earlyBird: number | null;
  teacherId: string | null;
  teacherName: string | null;
  scholarshipOpen: boolean;
};

export type LandingInstructor = { id: string; name: string; avatarUrl: string | null; role: string | null; courses: string[] };
export type LandingBundle = { id: string; title: string; description: string | null; price: number; original: number; currency: string; courses: number };

function earlyBirdPrice(row: Record<string, unknown>): number | null {
  const now = new Date().toISOString();
  if (!row.early_bird_price || !row.early_bird_start || !row.early_bird_end) return null;
  return String(row.early_bird_start) <= now && now <= String(row.early_bird_end) ? Number(row.early_bird_price) : null;
}

/**
 * Approved courses that are listed in the public catalogue, featured first.
 * An unlisted course (courses.listed = false, set by an admin for client-only
 * programmes) is left out here but still opens from a direct link.
 */
export async function fetchLandingCourses(): Promise<LandingCourse[]> {
  const columns = "id, title, summary, description, thumbnail_url, category, level, duration, language, price, currency, is_free, is_featured, early_bird_price, early_bird_start, early_bird_end, teacher_id, created_at, scholarship_open, profiles ( full_name )";
  const query = (select: string) => supabase.from("courses").select(select)
    .eq("approval_status", "approved")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);
  // `listed` arrives with the 2026-11-27 migration; read without it before that.
  let result = await query(`${columns}, listed`);
  if (result.error && isMissingSchema(result.error)) result = await query(columns);
  if (result.error) throw result.error;
  const rows = (result.data || []) as unknown as (Record<string, unknown> & { profiles: { full_name: string | null } | null })[];
  return rows.filter((row) => row.listed !== false).slice(0, 12).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    summary: (row.summary || row.description) as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    category: row.category as string | null,
    level: row.level as string | null,
    duration: row.duration as string | null,
    language: row.language as string | null,
    price: Number(row.price) || 0,
    currency: (row.currency as string) || "RWF",
    isFree: Boolean(row.is_free) || !Number(row.price),
    earlyBird: earlyBirdPrice(row),
    teacherId: row.teacher_id as string | null,
    teacherName: row.profiles?.full_name ?? null,
    scholarshipOpen: Boolean(row.scholarship_open),
  }));
}

/** Instructors of the published courses. Hidden on the page if profiles are not readable. */
export async function fetchLandingInstructors(courses: LandingCourse[]): Promise<LandingInstructor[]> {
  const ids = Array.from(new Set(courses.map((course) => course.teacherId).filter(Boolean))) as string[];
  if (!ids.length) return [];
  const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, job_role, organization").in("id", ids);
  if (error || !data) return [];
  return data
    .filter((person) => person.full_name)
    .map((person) => ({
      id: person.id,
      name: person.full_name as string,
      avatarUrl: person.avatar_url,
      role: person.job_role || person.organization || null,
      courses: courses.filter((course) => course.teacherId === person.id).map((course) => course.title),
    }))
    .sort((a, b) => b.courses.length - a.courses.length)
    .slice(0, 4);
}


export async function fetchLandingBundle(): Promise<LandingBundle | null> {
  const { data, error } = await supabase.from("course_bundles")
    .select("id, title, description, bundle_price, original_price, currency, bundle_courses ( id )")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  const row = data[0];
  return {
    id: row.id, title: row.title, description: row.description, price: Number(row.bundle_price), original: Number(row.original_price),
    currency: row.currency || "RWF", courses: Array.isArray(row.bundle_courses) ? row.bundle_courses.length : 0,
  };
}

/** The next cohort that has not started yet, for the hero. */
export async function fetchNextCohort(): Promise<{ name: string; startDate: string } | null> {
  const { data, error } = await supabase.from("cohorts").select("name, start_date")
    .eq("is_active", true).gte("start_date", new Date().toISOString()).order("start_date", { ascending: true }).limit(1);
  if (error || !data?.length || !data[0].start_date) return null;
  return { name: data[0].name, startDate: data[0].start_date };
}

export function formatAmount(amount: number, currency: string, locale: string) {
  const number = new Intl.NumberFormat(locale.startsWith("fr") ? "fr-FR" : "en-US", { maximumFractionDigits: currency === "USD" ? 2 : 0 }).format(amount);
  return currency === "USD" ? `$${number}` : `${currency} ${number}`;
}
