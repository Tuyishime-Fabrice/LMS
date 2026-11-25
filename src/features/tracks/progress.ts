/**
 * Progress through a skill or career track, derived from the learner's
 * own course enrolments. Tracks reuse courses; they never copy them.
 *
 * Order is a recommendation, not a lock: courses are bought and studied
 * individually, so a later course is flagged "recommended after …" until
 * the earlier required course is complete, but it is never blocked.
 */
export type TrackItemInput = { courseId: string; position: number; required: boolean };
export type EnrolmentInput = { courseId: string; completed: boolean; progress: number };

export type TrackItemState = "completed" | "in_progress" | "not_started";
export type TrackItemProgress = TrackItemInput & {
  state: TrackItemState;
  progress: number;
  /** The earlier required course the learner should finish first, if any. */
  recommendedAfter: string | null;
};

export type TrackProgress = {
  items: TrackItemProgress[];
  requiredTotal: number;
  requiredCompleted: number;
  percent: number;
  completed: boolean;
  started: boolean;
  /** The next course to work on: first unfinished required course, in order. */
  nextCourseId: string | null;
};

export function trackProgress(items: TrackItemInput[], enrolments: EnrolmentInput[]): TrackProgress {
  const byCourse = new Map(enrolments.map((row) => [row.courseId, row]));
  const ordered = [...items].sort((a, b) => a.position - b.position);
  let pendingRequired: string | null = null;

  const progressItems = ordered.map((item) => {
    const enrolment = byCourse.get(item.courseId);
    const state: TrackItemState = enrolment?.completed ? "completed" : enrolment ? "in_progress" : "not_started";
    const result: TrackItemProgress = {
      ...item,
      state,
      progress: enrolment?.completed ? 100 : Math.max(0, Math.min(100, Math.round(enrolment?.progress || 0))),
      recommendedAfter: state === "not_started" ? pendingRequired : null,
    };
    if (item.required && state !== "completed" && !pendingRequired) pendingRequired = item.courseId;
    return result;
  });

  const required = progressItems.filter((item) => item.required);
  const requiredCompleted = required.filter((item) => item.state === "completed").length;
  return {
    items: progressItems,
    requiredTotal: required.length,
    requiredCompleted,
    percent: required.length ? Math.round((requiredCompleted / required.length) * 100) : 0,
    completed: required.length > 0 && requiredCompleted === required.length,
    started: progressItems.some((item) => item.state !== "not_started"),
    nextCourseId: required.find((item) => item.state !== "completed")?.courseId ?? null,
  };
}
