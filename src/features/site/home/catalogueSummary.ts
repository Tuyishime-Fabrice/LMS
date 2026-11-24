import { COVER_FAMILIES, coverFamily, type CoverFamily } from "../../courses/coverFamily.ts";

/** The fields the home page needs from a listed course. */
export type PricedCourse = { title: string; category: string | null; price: number; earlyBird: number | null; isFree: boolean; currency: string };

/** What a learner pays today: the early-bird price while it runs, else the list price; 0 when free. */
export const currentPrice = (course: PricedCourse) => (course.isFree ? 0 : course.earlyBird ?? course.price);

export type SubjectSummary = { family: CoverFamily; count: number; from: number | null; currency: string; anyFree: boolean };

/**
 * Number of listed courses and the starting price per subject family, in the fixed family order.
 * Families without a course are left out, so no tile ever says "0 courses".
 */
export function subjectSummary(courses: PricedCourse[]): SubjectSummary[] {
  return COVER_FAMILIES.map((family) => {
    const inFamily = courses.filter((course) => coverFamily(course) === family);
    const paid = inFamily.filter((course) => !course.isFree);
    return {
      family,
      count: inFamily.length,
      from: paid.length ? Math.min(...paid.map(currentPrice)) : null,
      currency: paid[0]?.currency || "RWF",
      anyFree: inFamily.some((course) => course.isFree),
    };
  }).filter((summary) => summary.count > 0);
}

/** Lowest and highest current price of the paid courses, in the most common currency; null when none is paid. */
export function priceRange(courses: PricedCourse[]): { min: number; max: number; currency: string } | null {
  const paid = courses.filter((course) => !course.isFree);
  if (!paid.length) return null;
  const counts = new Map<string, number>();
  for (const course of paid) counts.set(course.currency, (counts.get(course.currency) || 0) + 1);
  const currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const prices = paid.filter((course) => course.currency === currency).map(currentPrice);
  return { min: Math.min(...prices), max: Math.max(...prices), currency };
}
