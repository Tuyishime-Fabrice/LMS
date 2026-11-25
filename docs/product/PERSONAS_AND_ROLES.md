# Personas and roles

| Role (DB `user_role`) | Product name | Responsibilities | Status |
|---|---|---|---|
| `student` | Learner | Discover, onboard, enrol/pay, learn, quizzes, submit work, read feedback, join Discord, track progress, certificates, competitions | Implemented |
| `teacher` (approved) | Instructor | Course structure/content, cohorts, announcements, assignments + rubrics, marks **with** written feedback, capstone outcomes, Discord links | Implemented |
| any non-admin account + `course_staff` row | Facilitator / supporter | Assigned to a whole course or one cohort. Follows learners, opens their work, saves provisional reviews (suggested mark, rubric scores, notes) for the instructor, keeps the cohort Discord link current, posts course announcements when course-wide. **Cannot** publish marks or feedback, edit content, or see contact details | Implemented (2026-11-25) |
| `admin` | Super Admin | Platform config, users/roles, approvals, tracks, competitions, payments, certificates, aggregate onboarding insights, audit logs | Implemented |
| any account | Competition participant | Register, submit, see own status and published leaderboard | Implemented |
| — | Organisation manager | Would manage a sponsored group | **Deferred**: organisation access is handled by the Academy via organisation requests + dedicated cohorts |

## Personas
- **Aline, early-career analyst (Kigali)** — evenings only, pays by MoMo, wants a portfolio. Needs clear next step and payment status.
- **Jean-Paul, NGO M&E officer (Francophone)** — sponsored by employer, French UI, cohort learner.
- **Théo, instructor** — teaches two courses, grades weekly, needs a queue and rubrics.
- **Grace, programme lead (admin)** — plans cohorts from demand, reconciles payments.

## Permission matrix (implemented; enforced in the database)
| Capability | Learner | Facilitator* | Instructor | Admin |
|---|---|---|---|---|
| Read course content | enrolled | assigned course | own | ✓ |
| See learners and progress | – | assigned scope, names only | own | ✓ |
| Open submissions and files | own | assigned scope | own | ✓ |
| Edit course/curriculum | – | – | own | ✓ |
| Post announcement to the whole course | – | course-wide facilitators | own | ✓ |
| Post announcement to one cohort | – | that cohort (or course-wide) | own | ✓ |
| Create assignment / rubric | – | **draft** only; goes live when the instructor approves | own; approves drafts | ✓ |
| Provisional review (suggested mark, rubric, notes) | – | assigned scope | reads | reads |
| Publish final mark + feedback | – | **–** | own | ✓ |
| Set cohort Discord link | – | assigned cohort (function `set_cohort_discord_url`) | own | ✓ |
| Assign facilitators | – | – | own course | ✓ |
| Read onboarding answers | own | – | – | aggregates only |
| Judge competitions | – | – | – | ✓ |

Facilitator rights come from `course_staff` (migration `20261125000000_facilitators.sql`), checked by
`facilitates_learner()` in every policy. "Assigned scope" = the whole course, or only learners whose enrolment is in
the assigned cohort. Facilitators are a workspace (`/facilitate`), not an account role: an approved instructor or a
graduate learner can facilitate without gaining instructor rights elsewhere. Facilitators draft assignments; only the
instructor's approval (`approve_assignment_draft`) writes the lesson (D-18).
