/**
 * The learner's access journey for one course, derived only from
 * authoritative rows: cohort applications, payments recorded by the
 * payment backend, enrolments, and certificates. Nothing here is set by
 * a button in the browser, so "paid", "accepted", "enrolled" and
 * "completed" are shown only when the database says so.
 *
 * Pure and framework-free so it can be unit-tested (tests/journey.test.mjs).
 */

export type StepState = "done" | "current" | "upcoming" | "blocked";
export type StepKey = "applied" | "review" | "payment" | "access" | "learning" | "certificate";

export type JourneyStep = {
  key: StepKey;
  state: StepState;
  /** Machine-readable reason, mapped to copy by the UI. */
  status: string;
  at: string | null;
};

export type JourneyStatus = "action_required" | "waiting" | "blocked" | "active" | "completed";
export type NextAction = "pay" | "retry_payment" | "continue" | "view_certificate" | "browse" | null;

export type JourneyInput = {
  courseId: string;
  isFree: boolean;
  application?: { status: "pending" | "approved" | "rejected"; createdAt: string; updatedAt: string | null } | null;
  /** Payments for this course, any order. Status comes from the payment callback/webhook. */
  payments: { status: "pending" | "success" | "failed" | null; createdAt: string | null; updatedAt: string | null }[];
  enrollment?: { enrolledAt: string; progress: number; completed: boolean; completionDate: string | null } | null;
  certificate?: { status: "pending" | "approved" | "rejected" | "revoked"; issuedAt: string | null } | null;
};

export type Journey = {
  courseId: string;
  steps: JourneyStep[];
  status: JourneyStatus;
  /** The step the learner should look at. */
  focus: StepKey;
  next: NextAction;
};

const newest = <T extends { createdAt: string | null }>(rows: T[]) =>
  [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];

export function buildJourney(input: JourneyInput): Journey {
  const steps: JourneyStep[] = [];
  const { application, enrollment, certificate } = input;
  const enrolled = Boolean(enrollment);

  // 1. Application (only for cohorts that take applications).
  if (application) {
    steps.push({ key: "applied", state: "done", status: "submitted", at: application.createdAt });
    if (application.status === "approved") steps.push({ key: "review", state: "done", status: "accepted", at: application.updatedAt });
    else if (application.status === "rejected") steps.push({ key: "review", state: "blocked", status: "not_accepted", at: application.updatedAt });
    else steps.push({ key: "review", state: enrolled ? "done" : "current", status: enrolled ? "accepted" : "under_review", at: null });
  }
  const rejected = application?.status === "rejected" && !enrolled;
  const awaitingReview = application?.status === "pending" && !enrolled;

  // 2. Payment (paid courses only). Never inferred from enrolment alone.
  const paid = input.payments.filter((row) => row.status === "success");
  const latest = newest(input.payments);
  if (!input.isFree) {
    if (paid.length) {
      const confirmed = newest(paid);
      steps.push({ key: "payment", state: "done", status: "confirmed", at: confirmed.updatedAt || confirmed.createdAt });
    } else if (enrolled) {
      // Enrolled without a payment on record: scholarship, sponsor or manual enrolment.
      steps.push({ key: "payment", state: "done", status: "not_needed", at: null });
    } else if (rejected || awaitingReview) {
      steps.push({ key: "payment", state: "upcoming", status: "after_review", at: null });
    } else if (latest?.status === "pending") {
      steps.push({ key: "payment", state: "current", status: "awaiting_confirmation", at: latest.createdAt });
    } else if (latest?.status === "failed") {
      steps.push({ key: "payment", state: "blocked", status: "failed", at: latest.updatedAt || latest.createdAt });
    } else {
      steps.push({ key: "payment", state: "current", status: "required", at: null });
    }
  }

  // 3. Access, 4. learning, 5. certificate.
  steps.push(enrolled
    ? { key: "access", state: "done", status: "granted", at: enrollment!.enrolledAt }
    : { key: "access", state: "upcoming", status: "pending", at: null });

  if (!enrolled) steps.push({ key: "learning", state: "upcoming", status: "not_started", at: null });
  else if (enrollment!.completed) steps.push({ key: "learning", state: "done", status: "completed", at: enrollment!.completionDate });
  else steps.push({ key: "learning", state: "current", status: enrollment!.progress > 0 ? "in_progress" : "not_started", at: null });

  if (certificate?.status === "approved") steps.push({ key: "certificate", state: "done", status: "issued", at: certificate.issuedAt });
  else if (certificate?.status === "revoked") steps.push({ key: "certificate", state: "blocked", status: "revoked", at: null });
  else if (enrollment?.completed) steps.push({ key: "certificate", state: "current", status: "pending", at: null });
  else steps.push({ key: "certificate", state: "upcoming", status: "not_yet", at: null });

  const blocked = steps.find((step) => step.state === "blocked");
  const current = steps.find((step) => step.state === "current");
  const payment = steps.find((step) => step.key === "payment");

  let status: JourneyStatus;
  let next: NextAction;
  if (rejected) { status = "blocked"; next = "browse"; }
  else if (payment?.state === "blocked") { status = "action_required"; next = "retry_payment"; }
  else if (payment?.status === "required") { status = "action_required"; next = "pay"; }
  else if (awaitingReview || payment?.status === "awaiting_confirmation") { status = "waiting"; next = null; }
  else if (certificate?.status === "approved") { status = "completed"; next = "view_certificate"; }
  else if (enrollment?.completed) { status = "completed"; next = null; }
  else if (enrolled) { status = "active"; next = "continue"; }
  else { status = "waiting"; next = null; }

  return { courseId: input.courseId, steps, status, focus: (blocked || current || steps[steps.length - 1]).key, next };
}

/** Journeys the learner must look at: anything not yet active or finished. */
export function needsAttention(journey: Journey) {
  return journey.status === "action_required" || journey.status === "waiting" || journey.status === "blocked";
}
