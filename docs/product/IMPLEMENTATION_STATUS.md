# Implementation status — 2026-11-24

Labels: **verified in code**, **observed at runtime** (demo mode, Playwright, no console errors on 15 screens),
**verified on DB** (scratch PostgreSQL 16 with Supabase stub), **not built**.

## Complete
| Item | Evidence |
|---|---|
| DATA+ green tokens, Inter only, DATA+ Academy naming | runtime (screenshots) |
| Role navigation (learner Explore/Community; no Messages; admin regrouped) | runtime |
| Company pages redirect to corporate site | code (`ExternalRedirect`, `siteConfig.ts`) |
| Discord links: schema, validation, staff editors, learner page, help panel | code, unit tests (3), DB tests (3), runtime |
| Access journey timeline (Home, course page) | unit tests (7), runtime (pending application shown truthfully) |
| At a glance panel on course page | runtime |
| Interest-based suggestions | unit tests (3), runtime |
| Skill/career tracks: hub, detail, progress, admin editor | unit tests (3), DB tests (4), runtime |
| Competitions: hub, detail/workspace, register, submit, leaderboard, admin judge/publish | unit tests (3), DB tests (8), runtime |
| Onboarding rewrite + consent; Settings learning & privacy; admin insights | DB tests (7), runtime (settings, insights) |
| Rubrics (author, learner view, scorer), feedback ≥ 20 chars, grade history | unit tests (3), DB tests (7), runtime |
| French and English for every new string (0 missing keys of 2,308) | script check |

## Partial / mocked
- Demo mode stores data in the browser; demo leaderboard and insights are computed in `src/demo/backend.ts`.
- Track progress uses `course_enrollments.progress_percentage` (DB trigger maintained in production; demo shows 0 for in-progress).
- Onboarding page itself not screenshot (demo accounts have completed onboarding); typechecked and lint-clean.

## Blocked / not built
- Migration not applied to any real Supabase project (by design). Until applied, new features show empty/"needs update" states and core flows work as before.
- Facilitator role, resubmission workflow, exam policies, practice launcher, organisation manager view.

## Checks (final run)
| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` | 37 pass, 0 fail (baseline 15) |
| `npm run lint` | 210 problems (151 errors, 59 warnings), baseline 212 (152/60); no new file flagged |
| `vite build` | pass |
| `scripts/check-supabase-setup.sh` | setup.sql in one transaction; security 35, ai_tutor 7, lesson_files 16, academy_experience 30 checks pass |
