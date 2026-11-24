# Decision log

| # | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-1 | 2026-11-24 | Primary colour returns to **DATA+ olive green #4B6929** (sampled from the logo), replacing the navy/orange identity of 2026-11-18. Ink is a green-tinted charcoal; success uses emerald so it never reads as "brand". | Master prompt asks for recognisable DATA+ green; logo is green; Clearbill/Northstar references are calm neutrals with one restrained action colour. | Adopted — leadership may revisit |
| D-2 | 2026-11-24 | One typeface (Inter); Bebas Neue no longer used. `text-poster` kept as a class but renders Inter bold. | Prompt: one coherent family; condensed poster type is marketing, not product. | Adopted |
| D-3 | 2026-11-24 | Product name **DATA+ Academy** in UI, emails, certificates, manifest. Legal entity text "DataPlus Labs" in Terms/Privacy left unchanged. | Naming was inconsistent (DataPlus Learning/Academy/Labs). The legal entity name is a legal question. | Adopted; legal name **needs confirmation** |
| D-4 | 2026-11-24 | `/about`, `/contact` redirect to `VITE_CORPORATE_SITE_URL` (default `https://dataplus.com`). Testimonials and partner logos removed from the landing; admin testimonials hidden from nav. | Domain boundary. Default URL taken from the brief; **confirm the real domain**. | Adopted |
| D-5 | 2026-11-24 | Chat retired from UI; tables and data kept; old routes redirect. Help panel no longer sends DMs. | Brief: Discord for discussion; preserve history. | Adopted |
| D-6 | 2026-11-24 | `discord_url` columns (new) instead of reusing `whatsapp_group_link`. | Different service, different validation; WhatsApp data preserved. | Adopted |
| D-7 | 2026-11-24 | "Self-paced" is shown as available for every approved course; cohorts shown when an active future cohort exists. | Current checkout grants course access without a cohort. **Confirm** no course is cohort-only. | Assumption |
| D-8 | 2026-11-24 | Track order is advisory ("recommended after"), not a lock. | Courses are sold individually; locking would contradict purchases. | Adopted |
| D-9 | 2026-11-24 | Feedback minimum = **20 characters**, enforced in DB for all roles, only when mark/feedback changes. | "Meaningful" needs a testable floor; existing rows stay valid. | Adopted; value configurable later |
| D-10 | 2026-11-24 | Rubric total scaled to /100 (existing grade scale); scorer fills the mark, instructor can still override the number. | Keeps certificate rule (≥ 65) and grade tables unchanged. | Adopted |
| D-11 | 2026-11-24 | Onboarding raw answers owner-only; admins get aggregates of consenting learners; groups < 5 suppressed. Phone, avatar, industry, job role no longer asked. | Data minimisation, explicit consent. Phone is asked at checkout where needed. | Adopted |
| D-12 | 2026-11-24 | Retention period for onboarding answers and grade history not set. | Needs DATA+ legal/policy decision (Rwanda Law 058/2021 on personal data). | **Open** |
| D-13 | 2026-11-25 | Facilitator implemented as **assignments** (`course_staff`), not a new `user_role` value. | An enum value would need a two-step migration and new routing for every role check; assignments keep rights per course/cohort and let instructors or graduates facilitate without new global powers. | Adopted (supersedes "deferred") |
| D-17 | 2026-11-25 | Facilitators write **provisional reviews**; only the instructor publishes marks and feedback. "Use as a starting point" copies the suggestion into the instructor's form. | Brief: instructor stays academically accountable and must write the comment. | Adopted |
| D-18 | 2026-11-25 | Facilitators cannot create assignments or rubrics yet. | Course content is instructor-owned; delegating needs a draft/approval state. | Deferred |
| D-19 | 2026-11-25 | Course announcements by facilitators only when assigned course-wide. | `teacher_announcements` has no cohort column; a cohort facilitator posting would reach other cohorts. | Adopted |
| D-20 | 2026-11-25 | Facilitators see learner names and progress, never emails or phone numbers; contact goes through Discord. | Data minimisation. | Adopted |
| D-21 | 2026-11-25 | Tightened `teacher_announcements` insert policy (any signed-in user could post to any course). | Pre-existing security gap found while scoping facilitator rights. | Fixed |
| D-14 | 2026-11-24 | Competitions accept HTTPS links (notebook, report), not files. | No private competition bucket yet; avoids a storage-policy change. | Adopted |
| D-15 | 2026-11-24 | Leaderboard shows first name + initial, best score, top 100, only after `results_published_at`. | Privacy for public participants. | Adopted |
| D-16 | 2026-11-24 | Work committed and pushed to the session branch `claude/dreamy-johnson-bjtqr3` (not main); migration **not applied** anywhere. | Cloud session is ephemeral; the brief forbids production changes, which a feature branch does not touch. | Adopted |
