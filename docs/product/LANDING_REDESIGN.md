# Landing redesign

Phased work on the public pages of dataplusacademy.com, following the 2026-11-24 landing brief.
Each phase ends with screenshots at 390, 768 and 1440 px and Lighthouse scores, and waits for approval.

## Phase 1: credibility fixes (done)
- **One source of facts:** `src/content/site-facts.ts` holds the brand, legal name, address, phone and email.
  Figures, social links, organisations, WhatsApp and opening hours are empty until DATA+ confirms them,
  and nothing renders while they are empty. `<ContentTodo>` marks the gaps in development builds only.
- **Claims match the data:**
  - The landing states only what is true for every listed course (D-23).
  - Free, early-bird and scholarship notes, bundles, tracks, competitions and the cohort pill appear only when real rows exist.
  - Removed: "AI tutor", "Best value", "up to 50%", "Capstone graded 65%+", the testimonial loader.
- **Catalogue hygiene:**
  - `courses.listed` (admin switch in Admin › Courses) hides test or client-only courses from the catalogue and landing.
  - `exhibition_projects.outcomes_verified` (switch in Admin › Exhibition) gates scores and outcome text on /exhibition.
  - Migration `20261127000000_listing_and_verification.sql`, tests in `supabase/tests/listing_and_verification.sql`.
  - `scripts/catalogue-check.sql` lists public courses with missing details (read-only).
- **Metadata:**
  - `usePageMeta` sets the title, description, canonical, Open Graph and robots on every public page; auth helper pages are `noindex`.
  - Course pages carry `Course` JSON-LD. `index.html` has one `EducationalOrganization` block.
  - Removed: keywords, "#1", fake breadcrumbs and the site search action.
- **Copy:**
  - Sentence case, no dashes.
  - The banned words ("unlock", "journey", "anytime, anywhere" and the rest) are gone from every visible string.
  - All new strings are in English and French.
- **Corporate site:** links and the default `VITE_CORPORATE_SITE_URL` now point to https://dataplusrwanda.com.

Lighthouse on the demo build (landing):
| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | 72 | 100 | 100 | 100 |
| Desktop | 98 | 100 | 100 | 100 |

Mobile performance (LCP 5.4 s) is held back by full-size hero JPEGs (about 400 KiB of savings from responsive WebP). This is Phase 3 work.

Screenshots: `screenshots/landing/phase1-*.webp`.

### French to review
All French added in Phase 1 was written here and needs a native read. The keys are:
- `meta.*`
- `landing.*2`, `landing.hero.heading`, `landing.hero.team`, `landing.pricing.*`, `landing.benefits.feedback*`
- `site.footer.mission2`
- `adminCourses.listed*`, `adminCourses.now*`
- `adminExhibition.verif*`, `adminExhibition.unverified`
- `login.tagline`, `signUp.tagline`, `*.connectPeers`
- `courseDetail.paidLessonNote`, `courseDetail.getCapstoneAccess`, `courseDetail.capstoneWorkspaceLocked`
- `courseContentPlayer.selectALessonToStart`

Wording choices to confirm:
- "suivi-évaluation" for M&E
- "lots de cours" for bundles
- "projet final" for capstone

## Phase 2 (next): design system
- Orange action colour `#C9501F` on buttons across the app.
- Type, motif and logo SVG.
- Course covers.
- Intro, which needs the video files.

## Content still needed from DATA+
- Figures to publish: learners trained, organisations, cohorts.
- Partner and client names, with permission.
- Social links, WhatsApp number and opening hours.
- Consent and names for the people in the photos.
- The logo as SVG.
- The intro videos.
- Answers on /about and /contact (LMS pages or corporate redirect), and on one branch versus a branch per phase.
