/**
 * Learning interests a learner can declare during onboarding, and the
 * words that link each one to course titles, categories and summaries.
 * Matching is deterministic: a course is recommended only because it
 * matches something the learner said, and the UI says which.
 */
export const INTERESTS = [
  { id: "data_analysis", label: "Data analysis", keywords: ["analysis", "analyst", "analytics", "excel", "spreadsheet", "pivot", "dashboard", "power bi"] },
  { id: "data_science", label: "Data science", keywords: ["data science", "machine learning", "statistics", "statistical", "regression", "python", "modelling", "modeling"] },
  { id: "ai", label: "AI", keywords: ["ai", "artificial intelligence", "machine learning", "llm", "generative"] },
  { id: "data_management", label: "Data management", keywords: ["data management", "database", "sql", "governance", "data quality", "literacy", "cleaning"] },
  { id: "geospatial", label: "Geospatial analysis", keywords: ["gis", "geospatial", "qgis", "mapping", "spatial", "remote sensing"] },
  { id: "programming", label: "Programming", keywords: ["python", "programming", "coding", "r programming", "javascript", "code"] },
  { id: "visualisation", label: "Data visualisation", keywords: ["visualisation", "visualization", "power bi", "tableau", "dashboard", "charts"] },
  { id: "research_me", label: "Research and M&E", keywords: ["m&e", "monitoring", "evaluation", "survey", "research", "kobo", "odk"] },
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordMatch = (text: string, keyword: string) => new RegExp(`(^|[^a-z0-9])${escape(keyword)}s?($|[^a-z0-9])`, "i").test(text);

/** Old free-form profile interests ("Data Analyst", "AI") mapped onto the taxonomy. */
export function normaliseInterests(values: readonly (string | null | undefined)[]): InterestId[] {
  const found = new Set<InterestId>();
  for (const raw of values) {
    if (!raw) continue;
    const value = raw.trim().toLowerCase();
    const direct = INTERESTS.find((item) => item.id === value || item.label.toLowerCase() === value);
    if (direct) { found.add(direct.id); continue; }
    for (const item of INTERESTS) {
      if (item.keywords.some((keyword) => wordMatch(value, keyword)) || wordMatch(item.label, value)) found.add(item.id);
    }
  }
  return Array.from(found);
}

export type MatchableCourse = { id: string; title: string; category?: string | null; summary?: string | null };

/** The first declared interest a course matches, or null. Title and category count; summary is a weaker signal. */
export function matchInterest(interests: readonly InterestId[], course: MatchableCourse): { interest: InterestId; strength: number } | null {
  let best: { interest: InterestId; strength: number } | null = null;
  for (const id of interests) {
    const item = INTERESTS.find((entry) => entry.id === id);
    if (!item) continue;
    const strong = item.keywords.some((keyword) => wordMatch(`${course.title} ${course.category || ""}`, keyword));
    const weak = !strong && item.keywords.some((keyword) => wordMatch(course.summary || "", keyword));
    const strength = strong ? 2 : weak ? 1 : 0;
    if (strength && (!best || strength > best.strength)) best = { interest: id, strength };
  }
  return best;
}

/** Courses to suggest, best matches first, excluding ones already taken. Stable for the same input. */
export function recommendCourses<T extends MatchableCourse>(interests: readonly InterestId[], courses: readonly T[], exclude: readonly string[], limit = 3) {
  const skip = new Set(exclude);
  return courses
    .map((course, index) => ({ course, index, match: matchInterest(interests, course) }))
    .filter((row) => row.match && !skip.has(row.course.id))
    .sort((a, b) => b.match!.strength - a.match!.strength || a.index - b.index)
    .slice(0, limit)
    .map((row) => ({ course: row.course, interest: row.match!.interest }));
}
