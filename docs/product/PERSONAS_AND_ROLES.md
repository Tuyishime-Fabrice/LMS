# Personas and roles

| Role (DB `user_role`) | Product name | Responsibilities | Status |
|---|---|---|---|
| `student` | Learner | Discover, onboard, enrol/pay, learn, quizzes, submit work, read feedback, join Discord, track progress, certificates, competitions | Implemented |
| `teacher` (approved) | Instructor | Course structure/content, cohorts, announcements, assignments + rubrics, marks **with** written feedback, capstone outcomes, Discord links | Implemented |
| — | Facilitator / supporter | Supports cohorts; may post announcements and assign work; **cannot** publish final marks | **Not implemented** (see permission matrix) |
| `admin` | Super Admin | Platform config, users/roles, approvals, tracks, competitions, payments, certificates, aggregate onboarding insights, audit logs | Implemented |
| any account | Competition participant | Register, submit, see own status and published leaderboard | Implemented |
| — | Organisation manager | Would manage a sponsored group | **Deferred**: organisation access is handled by the Academy via organisation requests + dedicated cohorts |

## Personas
- **Aline, early-career analyst (Kigali)** — evenings only, pays by MoMo, wants a portfolio. Needs clear next step and payment status.
- **Jean-Paul, NGO M&E officer (Francophone)** — sponsored by employer, French UI, cohort learner.
- **Théo, instructor** — teaches two courses, grades weekly, needs a queue and rubrics.
- **Grace, programme lead (admin)** — plans cohorts from demand, reconciles payments.

## Permission matrix (target)
| Capability | Learner | Facilitator* | Instructor | Admin |
|---|---|---|---|---|
| Read course content (enrolled) | ✓ | assigned | own | ✓ |
| Edit course/curriculum | – | – | own | ✓ |
| Post course/cohort announcement | – | assigned | own | ✓ |
| Create assignment / rubric | – | assigned (draft) | own | ✓ |
| Score rubric (provisional) | – | assigned | own | ✓ |
| Publish final mark + feedback | – | **–** | own | ✓ |
| Set Discord link | – | assigned cohort | own | ✓ |
| Read onboarding answers | own | – | – | aggregates only |
| Judge competitions | – | – | – | ✓ |

\*Facilitator needs a `course_staff(course_id, cohort_id, user_id, staff_role)` table and RLS
helper `is_course_staff()`; marks would need a `provisional` state. Not built — see roadmap.
