# Screen specifications (implemented)

| Screen | Route | Layout | Primary action | States |
|---|---|---|---|---|
| Learner Home | `/student/dashboard` | Needs attention → Continue hero → instalments → My courses + Coming up/Announcements → Suggested for you | Continue learning / journey action | loading skeleton, error retry, empty (choose first course), all done |
| Course | `/course/:id` | hero → At a glance (journey card if any + 4 facts) → outcomes → curriculum → capstone | Enrol / Buy | not found, pending approval |
| Tracks hub | `/tracks?kind=` | header, Skill/Career tabs, explainer, card grid | View/Continue track | empty per kind, error, migration missing (empty) |
| Track detail | `/tracks/:slug` | breadcrumb, header + next-course button; sequence list ‖ progress, details, outcomes, competencies | Next course | not found |
| Competitions hub | `/competitions` | tabs current/mine/past, cards with phase pill and deadline | See details / Open workspace | empty per tab |
| Competition | `/competitions/:slug` | header + Register; participant timeline; tabs overview/rules/my submissions/results ‖ timeline + resources | Register / Submit | sign-in required, closed, no results yet |
| Community | `/student/community` | note about announcements, Discord card per course | Open Discord | no link yet, no courses |
| Assignments | `/student/assignments` | filters, work rows with status, feedback, rubric disclosure | Submit | overdue, graded |
| Onboarding | `/onboarding` | top bar + step progress, one step per screen | Continue / Finish | name required; optional steps skippable |
| Settings | `/student/settings` | Profile, **Learning and privacy**, language, notifications, security | Save | migration missing note |
| Grading queue | `/teacher/assignments` | course picker, stats, rubric list, capstone + submissions with scorer and feedback | Save mark | feedback too short |
| Admin tracks | `/admin/tracks` | table + editor dialog | New track | migration missing |
| Admin competitions | `/admin/competitions` | list + editor + judging dialog | Publish results | |
| Admin insights | `/admin/insights` | privacy note, 2 stats, 6 question tables | — | no consenting learners |
