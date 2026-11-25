export type CourseLevel = "beginner" | "intermediate" | "advanced";

export function isCourseLevel(value: unknown): value is CourseLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

/** Layers of the centred plus lit for a share of lessons done: one from 33%, two from 66%, three at 100%. */
export function progressLayers(share: number): 0 | 1 | 2 | 3 {
  if (share >= 1) return 3;
  if (share >= 2 / 3) return 2;
  if (share >= 1 / 3) return 1;
  return 0;
}
