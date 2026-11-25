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

## Phase 2: design system and brand (done)
- **Tokens:**
  - Orange `action` on every button (the `Button` default variant plus 80 hand-styled buttons) and every progress fill.
  - Brand greens, olive-ink text, cream canvas, mint highlights.
  - Navy, electric blue and the floating squares are gone.
- **Type:** League Spartan 600/700 (self-hosted) for headings, Inter for the rest, line height 1.6.
- **Layout:** one radius (8 px), and shadows only on floating layers.
  - One 1200 px content width (`max-w-site`) on the home page, header, footer and discovery pages.
  - `.site-grid` 12-column utility.
- **`<PlusMotif>`:** trail, centred and stepped, in both tones, with a draw-in, a loading loop and `layersLit`.
  - Used now for course level on catalogue cards, the route loader and covers.
  - Other places come with Phases 3 and 4.
- **Logo:** cut from the poster frame (no SVG supplied) and used in the header, footer, sidebar and sign-in pages.
- **Generated course covers** replace uploaded thumbnails in every listing.
- **Intro overlay:** built and tested with placeholder videos. It is switched off until the real files arrive.
- **`/brand` reference page:** development and demo builds only.

Lighthouse on the demo build (landing), two mobile runs:
| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | 60 to 65 | 100 | 100 | 100 |
| Desktop | 97 | 100 | 100 | 100 |

Mobile performance fell from 72 in Phase 1: League Spartan adds a font family, and the 308 KB main script and full-size hero JPEGs are unchanged. Mobile LCP is 6.0 s and CLS 0.08.
- Phase 3 brings responsive hero images and a lighter home page.
- Phase 5 brings code splitting and font subsetting, to reach 90 or higher.

The intro screenshot uses a placeholder video with no alpha channel, hence the white box. The real WebM is transparent on cream.

Screenshots: `screenshots/landing/phase2-*.webp`.

### French to review (Phase 2)
`cover.family.*` (Analyse de données, Suivi et évaluation, IA pour les professionnels, Recherche et propositions, Géospatial), `intro.skip` (Passer l'intro).

## Phase 3: home page rebuild (done)
The home page (`src/pages/Index.tsx`, sections in `src/features/site/home/`) follows Section 10 of the brief.

| # | Section | Built as | Shown in production |
|---|---|---|---|
| 1 | Header | Lock-up "by DATA+ Rwanda"; Courses, For organisations, Student projects, About; language; Sign in; Explore courses. Cream, sticky, hairline on scroll; labelled full-screen menu on phones | Always |
| 2 | Hero | Headline and one sentence from Phase 1; classroom photo through the plus mask; real lesson-player screenshot; trail motif drawn after the intro; next cohort date in a reserved slot | Always (cohort date only when one exists) |
| 3 | Proof strip | Figures and organisations from `site-facts` | Hidden until confirmed |
| 4 | Find your course | One tile per subject family with live course count and starting price, linking to `/courses?subject=` | Subjects that have listed courses |
| 5 | Featured courses | Three courses on generated covers: level plus, duration, "Live cohort" and next start when a cohort exists, language, instructor photo or initials, price | When courses exist |
| 6 | Inside the platform | Keyboard tabs crossfading four real screenshots (lessons, progress, assignments, certificates) with captions; "Shown with sample data" | Always |
| 7 | The capstone | The five framework steps with stepped markers, the 65% pass mark, two classroom photos (one with the plus mask), verified projects | Projects only when an admin has verified outcomes |
| 8 | Who teaches | Needs bios (role, sectors, organisations); there is no bio field yet | Hidden |
| 9 | Learner stories | Needs consented stories | Hidden |
| 10 | Pricing and payment | Live price range, Mobile Money, instalments, early bird, free and scholarship lines only when true, bundle and tracks only when they exist | Always |
| 11 | For organisations | Existing copy, group photo, the enquiry form inline (same fields and `partner_requests` insert) | Always |
| 12 | FAQ and closing | Seven questions answered only from published facts (course copy, terms, verification), then the closing band with the centred motif | Always (scholarship question only when one is open) |
| 13 | Footer | Address, phone, email, links, dataplusrwanda.com, certificate checker, privacy, terms, © DATA+ Consultant Ltd | Always (WhatsApp, hours and socials once confirmed) |

- **Motion:** one shared IntersectionObserver (`useReveal`).
  - Reveals run once: 600 ms, 24 px rise, image scale 1.03 to 1.
  - Two plus-mask reveals at 900 ms: the hero photo and one capstone photo.
  - Tabs crossfade in 250 ms; hovers last 200 ms.
  - Everything is off under reduced motion. There is no parallax, carousel or looping decoration.
- **Photos:**
  - Four DATA+ training photos from the delivered archive. The originals are in `assets-src/photos/`.
  - Each has AVIF and WebP versions at 480, 960 and 1600 px in `public/images/home/`, all under 200 KB.
  - Each is served with `srcset`, `sizes` and width and height; images below the fold load lazily.
  - Alt text describes what is visible and names no one.
- **Screenshots:** captured from the demo build with sample data, with the learner's name replaced by "Learner name". Sources are in `assets-src/screenshots/`. No AI tutor tab until that feature is confirmed live.
- **Performance:** the heading and body fonts are preloaded from `public/fonts/`. Fonts now download only the Latin subset. The cohort date and subject tiles have reserved space. Layout shift is now 0.
- **Catalogue:** `/courses?subject=` filters by subject family, with a "Show all courses" link. Full filters are Phase 4.

Lighthouse on the demo build (landing), two mobile runs:
| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | 71 to 72 | 100 | 100 | 100 |
| Desktop | 98 | 100 | 100 | 100 |

Mobile LCP is 5.1 to 5.4 s and CLS 0. The page is client-rendered, so the heading paints only after the 304 KB main script runs. Phase 5 addresses this with code splitting, prerendering the home page, and moving the translations out of the main bundle.

Screenshots: `screenshots/landing/phase3-*.webp`.

### French to review (Phase 3)
- `landing.subjects.*`, `landing.featured.*`, `landing.platform.*`, `landing.capstone.*`, `landing.pricing.range`, `landing.pricing.perCourseNote`, `landing.pricing.paths*`
- `landing.proof.*`, `landing.teams.title2`, `landing.teams.programmes`, `landing.teams.photo`, `landing.teams.parent`
- `landing.faq.*`, `landing.hero.photoAlt`, `landing.hero.screenAlt`
- `catalogue.subject*`, `partner.formTitle`, `partner.another`, `site.byParent`, `site.menu`, `site.nav.organisations`, `site.nav.projects`

### To confirm
- The capstone step descriptions (one line each) explain the five framework names. Please check that they match how instructors teach the framework.
- Photo consent for the four training photos used (classroom, two group-work photos, the group photo outside).

## Phase 4: other pages (done)
- **/courses:**
  - **Search:** by title, topic, category or instructor, ignoring accents.
  - **Five filters:** subject, level, format, teaching language and price. All of them are kept in the URL.
  - **Filter logic:** `src/features/courses/catalogueFilters.ts`, unit-tested.
  - **Cards:** the shared course card (`CourseListingCard`, also used on the home page).
  - **Buttons:** every card has the same two buttons. "View course", plus "Buy" for paid courses, "Enrol free" for free ones, or "Open" once enrolled. Signed-out visitors go to sign-up and come back afterwards.
  - **Format:** means "a live cohort is scheduled". Courses have no other delivery data.
  - **Empty state:** uses the trail motif.
- **Course page:**
  - **Hero:** cream, on the shared content width. It shows level (plus indicator), teaching language, capstone, lessons, hours, modules and the instructor.
  - **Side card:** the generated cover (it plays the welcome video if there is one), the price in the site-wide "RWF 50,000" format, and buy and scholarship buttons. It adds "Try a free lesson" when a preview lesson exists, and payment options (Mobile Money, instalments when the cohort allows them, open scholarships).
  - **Below the hero:** "You will be able to" outcomes with plus markers, the capstone brief (five-step framework, 65% pass mark, capstone titles) and "Before you start".
  - **Visitors:** no "Your progress" and no locked-lesson panel. The player appears only for the free preview they open.
  - **Signed-in learners:** progress shows next to the centred plus, which lights a layer at 33%, 66% and 100%.
  - **Wording:** visitors see "Free preview" instead of "Teacher Preview Mode", and buttons are in sentence case.
- **Sign-in and sign-up:** a DATA+ training photo instead of the stock image, the current logo, and the existing honest text.
- **Shared header, footer and width:** /verify, /exhibition, /bundles, privacy, terms and the 404 page. The 404 page has the trail motif, a plain message and links to the catalogue and home.
- **Accessibility fixes found on the way:**
  - "At a glance" now uses a valid definition list.
  - Locked lessons use readable grey text.
  - The cover is no longer an unnamed button.
  - The header logo link's name now includes its visible text.
  - The catalogue has a results heading.

Lighthouse on the demo build (mobile / desktop):
| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| / | 72 / 97 | 100 / 100 | 100 / 100 | 100 / 100 |
| /courses | 71 / 98 | 100 / 100 | 100 / 100 | 100 / 100 |
| /course/… | 64 / 96 | 100 / 100 | 100 / 100 | 100 / 100 |
| /verify | 75 / 99 | 100 / 100 | 100 / 100 | 100 / 100 |

CLS is 0 on all four pages. Mobile performance is the main script (Phase 5).

Screenshots: `screenshots/landing/phase4-*.webp`.

### Not changed, and why
- **/about and /contact** redirect to dataplusrwanda.com, as DATA+ confirmed on 2026-11-25 (DECISION_LOG D-33). The corporate site owns company pages.
- **"Teach with us" and the Teacher role on sign-up.** The brief asks to be told first. Here is how it works today:
  1. The footer link opens `/signup?role=teacher`, which preselects "Teacher" on the public sign-up form.
  2. The new account goes to `/teacher/onboarding`, a short profile form (first and last name, email, phone and an avatar). It does not ask about teaching experience.
  3. The account then waits at `/teacher/pending-approval` with `teacher_approval_status = pending`.
  4. An admin approves or rejects it in Admin › Teacher approvals.

  So it is already an application with admin approval, but it starts by creating an account. A separate application form without an account would need a new table.
- **Certificate seal (centred motif):** the certificate preview is also what learners download, so adding a seal would change issued certificates. That needs a sign-off first.

### French to review (Phase 4)
`catalogue.*` (new keys), `courseDetail.*2`, `courseDetail.taughtIn`, `courseDetail.outcomesTitle`, `courseDetail.capstoneBrief*`, `courseDetail.tryFreeLesson`, `courseDetail.instalments`, `courseDetail.scholarshipOpen`, `courseDetail.requirements2`, `courseDetail.lessonsCount_*`, `courseDetail.modulesCount_*`, `courseContentPlayer.freePreview`, `courseContentPlayer.staffPreview`, `auth.panelTitle`, `auth.photoAlt`, `notFound.*`.

## Phase 5: quality pass (done)

### Performance
- **Translations load per language** (`src/i18n/config.ts`): a visitor downloads only English or only French, about 50 KB compressed, instead of both inside the main script.
  - The first render waits for that file, so no raw keys flash on screen.
  - `<html lang>` follows the language.
- **Home page pre-render** (`scripts/prerender-home.mjs`, `src/prerender/renderHome.tsx`):
  - `npm run build` and the Vercel build render the header and hero to HTML in English and French.
  - An inline script shows the right language on `/` for signed-out visitors before the first paint, and removes it everywhere else.
  - React replaces it with identical markup, so layout shift is 0.
  - The hero photo plays its plus-mask reveal in CSS at first paint, and React keeps it revealed.
  - If the step fails, the build keeps the plain `index.html`.
- **Smaller main script:** toasts and the suspension notice load right after the first paint. Main script: 313 to 170 KB compressed.
- **Fonts and layout:** the subject tiles keep their space even when course data is empty or fails, so nothing jumps.

Lighthouse, production build, home page:

| | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Mobile, simulated (Lighthouse default) | 83 to 89 | 100 | 96* | 100 | 2.7 to 2.9 s (estimate) | 0 |
| Mobile, devtools throttling (4G, 4x CPU, applied) | 84 to 86 | 100 | 96* | 100 | 2.0 to 2.1 s | 0 |
| Desktop | 100 | 100 | 96* | 100 | 0.6 s | 0 |

\* Best practices loses points here only because this sandbox cannot reach the Supabase project (console network errors) and the build has no source maps. On the deployed site it measures 100.

- **LCP target met.** A throttled Chromium trace paints the hero heading and photo at about 0.1 s unthrottled and 0.95 s at 4G with 4x CPU. Under applied throttling LCP is 2.0 s, below the 2.5 s target.
- **Performance score below 90.** The remaining gap is main-thread blocking time (250 to 770 ms) while the 170 KB main script runs on a slow phone.
- **Other pages are not pre-rendered.** For example, /courses scores 74 on mobile. Pre-rendering pages that show live data needs server rendering, which this stack does not have.

### Accessibility (Lighthouse and keyboard, all public pages: 100)
- **Fixed:**
  - The show-password buttons had no name and were too small.
  - About 90 low-contrast grey labels across the app (`text-muted-foreground/60` and lighter) now use the full muted colour (4.9:1).
  - The projects page's closing band had green text on green; it now uses cream text and sentence case.
  - Heading levels on projects and bundles.
  - Filter tabs on tracks and competitions are now a labelled button group (they pointed at panels that never existed).
  - "Skip to content" is now on every public page, and every page has a main landmark.
  - The 404 page no longer logs a console error.
- **Keyboard:** tabbing through the home page and catalogue reaches the skip link, header, filters and cards in order, with a visible focus ring on each.

### Both languages
- A French pass at 360 px on every public page found no overflow.
- It also found no English left in the interface apart from language names, which are written in their own language.
- Fixed along the way: lesson type labels in the curriculum (Vidéo, Devoir, Quiz) and "E-mail".

### Devices
- No horizontal overflow on the home page, catalogue, course page, sign-in and projects pages, in Playwright emulation of iPhone SE, iPhone 13, Pixel 7, Galaxy S8 and iPad Mini.
- **Not tested:** real devices and Safari/WebKit. Only Chromium is available here, so the intro's Safari path (MP4 on white) also needs a real check once the videos exist.

## Content still needed from DATA+
- Figures to publish: learners trained, organisations, cohorts.
- Partner and client names, with permission.
- Social links, WhatsApp number and opening hours.
- Consent and names for the people in the photos.
- The logo as SVG (the current one is cut from the video poster).
- The intro videos: `dataplus-academy-intro.webm` (alpha) and `.mp4`.
- An answer on one branch versus a branch per phase. (/about and /contact: settled, they stay redirects.)
