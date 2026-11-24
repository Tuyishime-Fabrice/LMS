# Data and permission model

Verified against `supabase/setup.sql` regenerated from all 62 migrations on PostgreSQL 16 (2026-11-24).

## Core (existing, unchanged)
profiles (role enum student|teacher|admin) · courses → course_chapters → course_lessons (content_type video|pdf|document|url|quiz|assignment) ·
lesson_quiz_questions (answers hidden; `get_lesson_quiz`, `submit_lesson_quiz`) · capstone_projects / capstone_submissions ·
assignment_submissions (one per lesson+student) · course_enrollments (progress_percentage maintained by trigger) ·
cohorts / cohort_join_requests · payments (status pending|success|failed, set by webhook) + instalments, coupons, bundles,
scholarships, price tiers · certificates (+ rules, auto-issue on capstone ≥ min grade) · scheduled_classes ·
announcements / teacher_announcements / notifications · conversations/direct_messages (**retired from UI, data kept**) · tutor_messages.

## Added by `20261124000000_academy_experience.sql`
| Object | Purpose | Read | Write |
|---|---|---|---|
| `courses.discord_url`, `cohorts.discord_url` | community link (format CHECK) | as parent row | course teacher / cohort teacher / admin (existing policies) |
| `learning_paths`, `learning_path_items` | skill/career tracks reusing courses | published → everyone; drafts → admin | admin |
| `competitions` | challenge definition | status ≠ draft → everyone | admin |
| `competition_registrations` | participation | own, admin | insert own while open; update own (withdraw; re-register only while open); admin |
| `competition_submissions` | link submissions | own, admin | insert own while `competition_can_submit`; judging fields forced null by trigger for non-admins |
| `get_competition_leaderboard(id)` | best score per user after publication | anon + authenticated | — |
| `learner_preferences` | onboarding answers + research consent | **owner only** | owner |
| `get_onboarding_insights()` | aggregates of consenting learners, groups < 5 suppressed | admin only (raises 42501 otherwise) | — |
| `course_lessons.rubric`, `capstone_projects.rubric` | rubric JSON (`is_valid_rubric` CHECK) | as parent row | course staff / admin |
| `*_submissions.rubric_scores` | per-criterion points | as submission | course staff / admin (trigger) |
| trigger `require_grade_feedback` | mark needs ≥ 20-char feedback when mark/feedback changes | — | all writers, incl. admin |
| `grade_history` | append-only copy of every published mark | learner own; course teacher; admin | trigger only (no grants) |

## Added by `20261125000000_facilitators.sql`
| Object | Purpose | Read | Write |
|---|---|---|---|
| `course_staff` (course, optional cohort, user, role `facilitator`) | facilitator assignments | own row; course instructor; admin | insert/delete: course instructor, admin (trigger: cohort must belong to course; never the instructor or an admin; `assigned_by` = caller) |
| `facilitates_learner(course, student)` | scope check used by every policy below | — | — |
| policies on `course_enrollments`, `assignment_submissions`, `capstone_submissions`, `cohorts` | facilitator **read** of assigned learners | — | unchanged (no write) |
| storage policy + `facilitator_can_read_file()` | open assigned learners' submission files | — | — |
| `can_access_lesson()` (replaced) | facilitators open every lesson of their course | — | — |
| `get_facilitated_learners()` | roster with names and progress, no email/phone | facilitator | — |
| `submission_reviews` | provisional review per submission per reviewer | reviewer (while assigned); course instructor; admin; **never learners** | reviewer, only for submissions in scope |
| `set_cohort_discord_url()` | change only `discord_url` of an assigned cohort | — | cohort teacher, admin, facilitator in scope |
| `find_staffing_candidate(email)`, `get_course_staff(course)` | assign by exact email; list staff | instructors/admins | — |
| `teacher_announcements` insert policy (replaced) | **fixes** any-user posting; now instructor, admin or course-wide facilitator | — | — |

## Retention and deletion
`learner_preferences` cascades with the profile; learners can delete their row any time. Grade history follows the
submission's student; deletion policy for academic records needs a DATA+ decision (see DECISION_LOG D-12).

## Types
`src/integrations/supabase/types.ts` updated by hand from the migration (no live project access). Regenerate with
`supabase gen types` after applying.

## Manual steps to go live
1. Back up the database. 2. Run `20261124000000_academy_experience.sql` in the SQL editor. 3. Optionally run
`supabase/tests/academy_experience.sql` against a **scratch** copy. 4. Set `VITE_CORPORATE_SITE_URL` in Vercel.
5. Add Discord links per course/cohort. 6. Create tracks/competitions in Admin.
**Note:** after step 2, instructors can no longer save a mark without written feedback.
7. Then run `20261125000000_facilitators.sql` (needs the previous migration) and assign facilitators from the instructor Overview.
