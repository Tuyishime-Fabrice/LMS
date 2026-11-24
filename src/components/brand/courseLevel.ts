export type CourseLevel = "beginner" | "intermediate" | "advanced";

export function isCourseLevel(value: unknown): value is CourseLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}
