# Functional requirements

Format: actor · trigger · preconditions · main flow · alternatives/errors · data · permissions · acceptance.

## FR-1 Access journey status
- **Actor** learner · **Trigger** opens Home or a course page.
- **Pre** signed in as student.
- **Flow** load payments (course_id), cohort_join_requests, enrolments, certificates → `buildJourney` per course → show cards whose status ∈ {action_required, waiting, blocked}.
- **Alt** pending payment → poll every 15 s; failed → "Try payment again"; rejected application → "Browse courses"; enrolled without payment row → payment "Not required" (never "Paid").
- **Data** read only. **Perm** RLS on each table (own rows).
- **Accept** unit tests `tests/journey.test.mjs` (7 cases) pass; no state shown without a source row.

## FR-2 Mandatory written feedback
- **Actor** instructor/admin · **Trigger** saves a mark on an assignment or capstone submission.
- **Flow** UI checks `feedbackIsValid` (≥ 20 trimmed chars) on new or existing feedback → update row → trigger `require_grade_feedback` re-checks → `record_grade_history` appends.
- **Errors** short/missing feedback → toast and no save; DB `23514` mapped to same message.
- **Accept** `supabase/tests/academy_experience.sql`: mark without feedback refused; token comment refused; two marks → two history rows; learner reads own history only.

## FR-3 Rubrics
- Instructor adds/edits rubric (1–20 criteria, 1–8 levels, points ≥ 0) on assignment lesson or capstone; DB `is_valid_rubric` check.
- Learner sees rubric on Assignments before submission; after marking sees awarded level per criterion.
- Scorer: choosing a level for every criterion sets the mark = round(points / max × 100).
- `rubric_scores` writable by course staff/admin only (trigger `protect_submission_rubric_scores`).

## FR-4 Tracks
- Admin creates track (kind skill|career, slug, title, outcomes, competencies, level, hours, language, ordered courses, required flag, milestone, published).
- Public reads published tracks + their items only. Progress = completed required courses / required courses.
- **Accept** `tests/tracks.test.mjs`; DB test: learner sees published only; learner cannot create.

## FR-5 Competitions
- Visibility: status ≠ draft. Register: signed in, `competition_registration_open` true. Submit: registered, status open, after start, before deadline (`competition_can_submit`). Participants cannot write score/feedback/status (trigger). Leaderboard: after `results_published_at`, best score per user, name shortened.
- **Accept** DB tests (8 checks) + `tests/competitions.test.mjs`.

## FR-6 Onboarding & consent
- Only full name required. Optional: goal, level, interests, career goal, mode, weekly hours, access route (+ org name).
- Research consent unchecked by default; timestamp set on opt-in, cleared on withdrawal.
- Learner can edit interests, toggle consent, delete answers (Settings). Instructors and admins cannot read rows; admin RPC returns counts of consenting learners with answers < 5 folded into `suppressed`.

## FR-7 Discord community
- Staff set `discord_url` (https + discord.gg/discord.com only; DB check + `safeDiscordUrl`). Cohort link overrides course link. Opens in a new tab with `rel="noopener noreferrer"` and an explanation.

## FR-8 Corporate boundary
- `/about`, `/contact` redirect to `${VITE_CORPORATE_SITE_URL}/about|/contact`; footer "About DATA+" links out; no testimonials/partner logos in the LMS.
