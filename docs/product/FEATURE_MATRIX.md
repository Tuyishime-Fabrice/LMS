# Feature matrix

Legend: ✅ end-to-end in code (and demo) · 🟡 partial · ⛔ not built · 🧪 needs migration `20261124000000` applied.

| Area | Feature | Status | Notes |
|---|---|---|---|
| Identity | Sign-up/in, email verify, reset, roles | ✅ | unchanged |
| Onboarding | 4-step, optional answers, research opt-in | ✅🧪 | falls back to profile fields if table missing |
| Privacy | Edit/withdraw/delete answers; admin aggregates | ✅🧪 | small-group suppression in SQL |
| Discovery | Catalogue, course page, At a glance | ✅ | |
| Discovery | Interest-based suggestions | ✅ | deterministic, labelled reason |
| Tracks | Skill/career hub, detail, progress, admin editor | ✅🧪 | order is advisory, not enforced |
| Enrolment | Free enrol, MoMo checkout, instalments, coupons, scholarships | ✅ | unchanged backend |
| Enrolment | Journey timeline (Home, course page) | ✅ | derived from DB rows |
| Learning | Learning room, video/PDF/URL, resume, complete | ✅ | |
| Learning | External practice (Colab/JupyterLite) | 🟡 | via URL lessons; no dedicated launcher yet |
| Assessment | Server-marked quizzes | ✅ | from 2026-11-12 migration |
| Assessment | Timed exams, attempts, question banks | ⛔ | policy undefined |
| Assignments | Upload, deadlines, status | ✅ | |
| Assignments | Rubrics (author, show, score) | ✅🧪 | |
| Assignments | Feedback required with mark | ✅🧪 | DB trigger + UI |
| Assignments | Grade history (append-only) | ✅🧪 | no UI to browse history yet |
| Assignments | Resubmission workflow | ⛔ | upsert overwrites file today |
| Capstone | Submit, grade, auto-certificate ≥ rule | ✅ | |
| Community | Discord links course/cohort, community page | ✅🧪 | |
| Community | Direct messages | removed from UI | tables kept |
| Announcements | Course/cohort/academy | ✅ | |
| Competitions | Hub, register, submit link, judge, leaderboard | ✅🧪 | file uploads not supported |
| Roles | Facilitator (assign, workspace, provisional reviews, cohort Discord, announcements) | ✅🧪 | needs `20261125000000_facilitators.sql` |
| Roles | Facilitator assignment drafts with instructor approval | ✅🧪 | needs `20261126000000_drafts_and_cohort_announcements.sql` |
| Announcements | Cohort-only announcements (read + notifications scoped) | ✅🧪 | same migration; falls back to course-wide with a title prefix before it |
| Organisations | Sponsor request → dedicated cohort | 🟡 | manual via Organisation requests |
| Admin | Payments, pricing, certificates, logs | ✅ | unchanged |
