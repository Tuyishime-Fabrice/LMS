/**
 * Rubrics for assignments and capstones. The shape matches the database
 * check public.is_valid_rubric; marks are scaled to 100 like every other
 * grade in DATA+ Academy.
 */
export type RubricLevel = { label: string; points: number; description?: string };
export type RubricCriterion = { id: string; title: string; description?: string; levels: RubricLevel[] };
export type Rubric = { criteria: RubricCriterion[] };
/** Per criterion: the points awarded and an optional comment. */
export type RubricScores = Record<string, { points: number; comment?: string }>;

/** Written feedback the database accepts with a mark. */
export const MIN_FEEDBACK_LENGTH = 20;
export const feedbackIsValid = (text: string | null | undefined) => (text || "").trim().length >= MIN_FEEDBACK_LENGTH;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A rubric from stored JSON, or null if it is missing or malformed. */
export function parseRubric(value: unknown): Rubric | null {
  if (!isObject(value) || !Array.isArray(value.criteria)) return null;
  if (value.criteria.length < 1 || value.criteria.length > 20) return null;
  const criteria: RubricCriterion[] = [];
  for (const raw of value.criteria) {
    if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.title !== "string" || !raw.title.trim()) return null;
    if (!Array.isArray(raw.levels) || raw.levels.length < 1 || raw.levels.length > 8) return null;
    const levels: RubricLevel[] = [];
    for (const level of raw.levels) {
      if (!isObject(level) || typeof level.label !== "string" || typeof level.points !== "number" || level.points < 0) return null;
      levels.push({ label: level.label, points: level.points, description: typeof level.description === "string" ? level.description : undefined });
    }
    criteria.push({ id: raw.id, title: raw.title, description: typeof raw.description === "string" ? raw.description : undefined, levels });
  }
  return { criteria };
}

export const criterionMax = (criterion: RubricCriterion) => Math.max(...criterion.levels.map((level) => level.points));
export const rubricMax = (rubric: Rubric) => rubric.criteria.reduce((sum, criterion) => sum + criterionMax(criterion), 0);

/** Total and mark out of 100. `complete` is false until every criterion has a score. */
export function scoreRubric(rubric: Rubric, scores: RubricScores) {
  const max = rubricMax(rubric);
  let points = 0;
  let scored = 0;
  for (const criterion of rubric.criteria) {
    const score = scores[criterion.id];
    if (score && Number.isFinite(score.points)) {
      points += Math.max(0, Math.min(score.points, criterionMax(criterion)));
      scored += 1;
    }
  }
  return { points, max, complete: scored === rubric.criteria.length, mark: max > 0 ? Math.round((points / max) * 100) : 0 };
}

/** Rubric scores from stored JSON, ignoring anything malformed. */
export function parseScores(value: unknown): RubricScores {
  if (!isObject(value)) return {};
  const out: RubricScores = {};
  for (const [key, raw] of Object.entries(value)) {
    if (isObject(raw) && typeof raw.points === "number") out[key] = { points: raw.points, comment: typeof raw.comment === "string" ? raw.comment : undefined };
  }
  return out;
}
