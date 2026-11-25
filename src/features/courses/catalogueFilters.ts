import { COVER_FAMILIES, coverFamily, type CoverFamily } from "./coverFamily.ts";

/**
 * Catalogue search and filters, kept in the URL (?q=&subject=&level=&format=&lang=&price=).
 * Pure, so it is unit-tested (tests/catalogueFilters.test.mjs).
 * "format=live" means the course has a scheduled cohort; there is no other delivery data to filter on.
 */
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const LANGUAGES = ["en", "fr"] as const;
export type Filters = {
  q: string;
  subject: CoverFamily | null;
  level: (typeof LEVELS)[number] | null;
  format: "live" | null;
  lang: (typeof LANGUAGES)[number] | null;
  price: "free" | "paid" | null;
};

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : null;

export function parseFilters(params: URLSearchParams): Filters {
  return {
    q: (params.get("q") || "").trim().slice(0, 80),
    subject: pick(params.get("subject"), COVER_FAMILIES),
    level: pick(params.get("level"), LEVELS),
    format: pick(params.get("format"), ["live"] as const),
    lang: pick(params.get("lang"), LANGUAGES),
    price: pick(params.get("price"), ["free", "paid"] as const),
  };
}

/** Course languages are stored as codes or names ("fr", "Français", "English"). */
export function languageCode(value: string | null | undefined): "en" | "fr" | null {
  const v = (value || "").trim().toLowerCase();
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("en") || v.startsWith("ang")) return "en";
  return null;
}

export type FilterableCourse = {
  id: string; title: string; summary: string | null; category: string | null; level: string | null; language: string | null; isFree: boolean; teacherName: string | null;
};

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function applyFilters<T extends FilterableCourse>(courses: T[], filters: Filters, liveCourseIds: Set<string>): T[] {
  const words = fold(filters.q).split(/\s+/).filter(Boolean);
  return courses.filter((course) => {
    if (filters.subject && coverFamily(course) !== filters.subject) return false;
    if (filters.level && (course.level || "").toLowerCase() !== filters.level) return false;
    if (filters.format === "live" && !liveCourseIds.has(course.id)) return false;
    if (filters.lang && languageCode(course.language) !== filters.lang) return false;
    if (filters.price === "free" && !course.isFree) return false;
    if (filters.price === "paid" && course.isFree) return false;
    if (words.length) {
      const haystack = fold([course.title, course.summary, course.category, course.teacherName].filter(Boolean).join(" "));
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

export const activeFilterCount = (filters: Filters) =>
  [filters.q, filters.subject, filters.level, filters.format, filters.lang, filters.price].filter(Boolean).length;
