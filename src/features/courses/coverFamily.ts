/**
 * Subject family of a course, used to pick its generated cover.
 * Deterministic: the course's category is checked first, then its title.
 * Courses that match no family get the data analysis cover.
 */
export const COVER_FAMILIES = ["data", "me", "ai", "research", "geo"] as const;
export type CoverFamily = (typeof COVER_FAMILIES)[number];

const RULES: { family: CoverFamily; words: string[] }[] = [
  { family: "geo", words: ["gis", "geospatial", "qgis", "mapping", "spatial", "remote sensing", "arcgis"] },
  { family: "me", words: ["m&e", "monitoring", "evaluation", "suivi", "évaluation", "mel", "logframe", "indicator", "kobo", "odk"] },
  { family: "ai", words: ["ai", "artificial intelligence", "intelligence artificielle", "ia", "machine learning", "llm", "generative", "chatgpt", "prompt"] },
  { family: "research", words: ["research", "recherche", "proposal", "proposition", "grant", "thesis", "survey design", "academic writing", "literature review"] },
  { family: "data", words: ["data", "données", "analysis", "analyse", "excel", "power bi", "sql", "python", "statistics", "stata", "spss", "dashboard"] },
];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, word: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(word)}s?($|[^\\p{L}\\p{N}])`, "iu").test(text);

export function coverFamily(course: { title: string; category?: string | null }): CoverFamily {
  for (const text of [course.category || "", course.title]) {
    if (!text) continue;
    const rule = RULES.find((r) => r.words.some((word) => has(text, word)));
    if (rule) return rule.family;
  }
  return "data";
}
