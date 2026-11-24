# DATA+ Academy LMS — project rules

This repository is **dataplusacademy.com**, the learning platform. The corporate site
(dataplus.com, WordPress) owns company pages; never rebuild About/Contact/marketing here.
Read `docs/product/` before changing behaviour; it is the source of truth.

## Stack
React 18 + TypeScript, Vite, Tailwind + shadcn/Radix, React Router, TanStack Query,
Supabase (auth, Postgres + RLS, storage), i18next (en/fr), Vercel functions in `api/`.

## Rules
- **Truthful state only.** Paid/accepted/enrolled/completed come from the database
  (payment webhook, enrolments, certificates), never from a client button.
  See `src/features/enrolment/journey.ts`.
- **Security lives in the database.** Every new table gets RLS and a test in
  `supabase/tests/*.sql`. UI hiding is not access control.
- **Marks need feedback.** A grade is never saved without a written comment of
  ≥ 20 characters (DB trigger `require_grade_feedback`, UI `feedbackIsValid`).
- **Facilitators are assignments, not a role.** Rights come from `course_staff` via
  `facilitates_learner()`; they never publish marks (provisional `submission_reviews` only).
- **No chat.** Cohort discussion is Discord (`discord_url` on courses/cohorts);
  the LMS keeps announcements and system notifications only.
- **Reuse courses.** Tracks and cohorts reference courses; never duplicate content.
- **Privacy.** Onboarding answers (`learner_preferences`) are owner-only; admins get
  aggregates of consenting learners via `get_onboarding_insights()` only.
- **Tolerate unapplied migrations.** Reads of new columns fall back (`isMissingSchema`).
- **Tokens, not colours.** Colours live in `src/index.css`; use `primary`, `forest`,
  `leaf`, `success`… Never hard-code hex in components. One typeface: Inter.
- **Both languages.** Every `t(key, fallback)` needs an entry in `en.json` and `fr.json`.
- Never apply migrations to production from here; never commit secrets.

## Commands
`npm test` (Node tests, incl. TS logic via strip-types) · `npm run typecheck` ·
`npm run build` · `VITE_DEMO_MODE=true npx vite --host 127.0.0.1` (demo, no Supabase) ·
`scripts/build-supabase-setup.sh <pg>` then `scripts/check-supabase-setup.sh <pg>` (scratch DB).
`npm run lint` has pre-existing errors in older files; new code must be lint-clean.

## Where things are
`src/features/*` domain modules (enrolment, tracks, competitions, community, rubrics,
preferences, discovery, learning, facilitation) · `src/components/shell` app shell + navigation ·
`src/pages` one file per route · `supabase/migrations` (latest: `20261125000000_facilitators.sql`).
