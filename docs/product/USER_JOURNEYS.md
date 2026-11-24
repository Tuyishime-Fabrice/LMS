# User journeys

Each journey: trigger → steps → states shown → where it lives. "Verified" = exercised in
demo mode on 2026-11-24 (screenshots in `screenshots/`); DB rules verified on a scratch Postgres.

## J1 Discover → enrol (learner)
1. Landing `/` → *Ways to learn* (courses, skill tracks, career tracks, competitions) and self-paced vs cohort.
2. Course page `/course/:id`: hero, **At a glance** (self-paced, next cohort, assessments, certificate rule), curriculum, price.
3. Free course → enrol. Paid → checkout dialog (XentriPay MoMo) → payment row `pending` → webhook sets `success` → enrolment.
4. Cohort with application → `cohort_join_requests` `pending` → instructor approves → payment (if required) → access.
States: `journey.ts` (applied, review, payment, access, learning, certificate). Verified (demo + unit tests).

## J2 Status tracking
Home → **Needs your attention** lists every course whose journey is `action_required`,
`waiting` or `blocked`, with a timeline, an explanation and the one valid action
(Complete payment / Try again / Browse). Pending payments re-check every 15 s. Same card on the course page.

## J3 Learn
Home → *Continue learning* → learning room `/learn/:course/:lesson`: curriculum, lesson, previous/next,
mark complete, Help panel (AI tutor + **Ask your cohort** on Discord). Quizzes marked server-side.

## J4 Submit and get feedback
`/student/assignments`: deadlines, status (to do / awaiting grade / graded), **rubric visible before submission**,
upload; after marking: mark, instructor feedback, awarded rubric levels.

## J5 Grade (instructor)
`/teacher/assignments` (Grading queue): choose course → rubric list (add/edit) → per submission: rubric scorer
computes /100 → written feedback (≥ 20 chars, live counter) → Save. DB refuses marks without feedback; every
published mark is copied to `grade_history`.

## J6 Tracks
`/tracks` (Skill | Career tabs) → `/tracks/:slug`: ordered courses, optional items, milestones, "recommended after",
outcomes, competencies (career), progress from completed courses, next-course action. Admin builds at `/admin/tracks`.

## J7 Competitions
`/competitions` (current / mine / past) → `/competitions/:slug`: overview, rules, timeline, Register (DB-checked
window) → workspace: participant timeline, submit a link, see own submissions → results/leaderboard after publication.
Admin: `/admin/competitions` create, judge, publish.

## J8 Onboarding and privacy
After sign-up → `/onboarding`: You (name, required) → Goals (optional) → How you learn (optional, incl. who pays) →
Privacy (explicit research opt-in, unchecked). Later: Settings → **Learning and privacy** (edit interests, withdraw
consent, delete answers). Admin: `/admin/insights` aggregates only, groups < 5 suppressed.

## J9 Community
`/student/community` lists Discord link per enrolled course (cohort channel overrides course server), with a
note that announcements/grades stay in the LMS. Instructors set links from Overview (course) and Cohorts (cohort).
Old `/student/chat` → community; `/teacher/chat` → announcements.
