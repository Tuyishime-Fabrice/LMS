/**
 * Competition rules shown in the interface. They mirror the database
 * functions competition_registration_open and competition_can_submit,
 * which remain the authority: the UI only decides which button to offer.
 */
export type CompetitionTimes = {
  status: "draft" | "upcoming" | "open" | "judging" | "closed";
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  starts_at: string | null;
  submission_deadline: string | null;
  results_published_at: string | null;
};

const before = (iso: string | null, now: Date) => Boolean(iso) && new Date(iso!) > now;
const reached = (iso: string | null, now: Date) => Boolean(iso) && new Date(iso!) <= now;

export function registrationOpen(c: CompetitionTimes, now = new Date()) {
  return (c.status === "upcoming" || c.status === "open")
    && (!c.registration_opens_at || reached(c.registration_opens_at, now))
    && (!c.registration_closes_at || before(c.registration_closes_at, now));
}

export function submissionsOpen(c: CompetitionTimes, now = new Date()) {
  return c.status === "open" && (!c.starts_at || reached(c.starts_at, now)) && (!c.submission_deadline || before(c.submission_deadline, now));
}

export function resultsPublished(c: CompetitionTimes, now = new Date()) {
  return reached(c.results_published_at, now);
}

/** One word for the hub card and filters. */
export function phase(c: CompetitionTimes, now = new Date()): "upcoming" | "open" | "judging" | "results" | "closed" {
  if (resultsPublished(c, now)) return "results";
  if (c.status === "judging" || (c.status === "open" && c.submission_deadline && reached(c.submission_deadline, now))) return "judging";
  if (c.status === "closed") return "closed";
  if (submissionsOpen(c, now)) return "open";
  return "upcoming";
}

export type ParticipantStep = { key: "registered" | "submitted" | "judging" | "results"; state: "done" | "current" | "upcoming" | "blocked"; status: string; at: string | null };

/** The participant's own progress through a competition. */
export function participantSteps(
  c: CompetitionTimes,
  registration: { status: "registered" | "withdrawn" | "disqualified"; created_at: string } | null,
  submissions: { submitted_at: string; status: string }[],
  now = new Date(),
): ParticipantStep[] {
  const latest = [...submissions].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
  const current = phase(c, now);
  const steps: ParticipantStep[] = [];
  if (!registration) steps.push({ key: "registered", state: registrationOpen(c, now) ? "current" : "upcoming", status: "not_registered", at: null });
  else if (registration.status !== "registered") steps.push({ key: "registered", state: "blocked", status: registration.status, at: null });
  else steps.push({ key: "registered", state: "done", status: "registered", at: registration.created_at });

  const active = registration?.status === "registered";
  if (latest) steps.push({ key: "submitted", state: "done", status: "submitted", at: latest.submitted_at });
  else if (active && submissionsOpen(c, now)) steps.push({ key: "submitted", state: "current", status: "open", at: c.submission_deadline });
  else if (active && (current === "judging" || current === "results" || current === "closed")) steps.push({ key: "submitted", state: "blocked", status: "missed", at: null });
  else steps.push({ key: "submitted", state: "upcoming", status: "not_yet", at: null });

  if (current === "results") steps.push({ key: "judging", state: "done", status: "done", at: null });
  else if (current === "judging" && latest) steps.push({ key: "judging", state: "current", status: "judging", at: null });
  else steps.push({ key: "judging", state: "upcoming", status: "not_yet", at: null });

  steps.push(current === "results"
    ? { key: "results", state: "done", status: "published", at: c.results_published_at }
    : { key: "results", state: "upcoming", status: "not_yet", at: null });
  return steps;
}
