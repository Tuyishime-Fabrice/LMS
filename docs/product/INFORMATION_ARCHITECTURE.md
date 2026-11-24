# Information architecture (implemented)

## Public (SiteHeader; signed-in learners see the same pages inside the app shell)
`/` home · `/courses` catalogue · `/course/:id` course · `/tracks`, `/tracks/:slug` · `/competitions`,
`/competitions/:slug` · `/bundles` course bundles (pricing packages, footer only) · `/exhibition` student projects ·
`/verify[/:code]` certificate check · `/auth`, `/signup`, `/forgot-password`, `/verify-email` · legal pages.
`/about`, `/contact` → redirect to `VITE_CORPORATE_SITE_URL` (default https://dataplus.com).

## Learner shell
**Learn**: Home · My learning (`/learn/*`) · Assignments · Grades · Calendar · Certificates
**Explore**: Courses · Skill & career tracks · Competitions
**Community**: Cohort community
**Account**: Payments · Settings (incl. Learning and privacy)
Phone tab bar: Home, My learning, Assignments, Courses.

## Instructor shell
Overview (courses + Discord link) · Cohorts (Discord link per cohort) · Calendar ·
**Review**: Grading queue · Grades · Learners · **Communicate**: Announcements · Settings.

## Facilitation workspace (any account with a `course_staff` row)
Overview `/facilitate` (one card per assignment: learners, awaiting review, Review work, Learners, Open course,
cohort Discord link or course announcement) · Review work `/facilitate/review` (Needs review / Reviewed / Marked) ·
Learners `/facilitate/learners` · Assignment drafts `/facilitate/assignments`. Reached from a **Facilitation** link at the bottom of the learner or instructor sidebar.
Instructors assign facilitators from Overview (heart icon per course); admins from Admin → Courses.

## Admin shell
Overview · **People**: Users and roles, Instructor approvals, Organisation requests, Onboarding insights ·
**Academics**: Courses, Skill & career tracks, Competitions, Calendar, Learner progress, Grades, Certificates,
Student projects · **Finance**: Payments, Pricing tiers, Coupons, Bundles, Scholarships ·
**System**: Announcements, Activity logs, Settings.
Hidden but routable: `/admin/testimonials` (marketing; candidate for removal).
