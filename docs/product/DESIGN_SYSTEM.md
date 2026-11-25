# Design system

Implemented in `src/index.css` (tokens) and `tailwind.config.ts`; shared pieces in
`src/components/shell/page.tsx`, `src/features/enrolment/StatusTimeline.tsx`, shadcn `src/components/ui`.

## Colour (HSL tokens; names are historical)
From the 2026-11-24 brand brief: the greens of dataplusrwanda.com and the plus motif, the Academy orange for actions.
| Token | Hex | Use |
|---|---|---|
| `action` / `action-hover` | #C9501F / #A8411A | **Buttons and progress fills only.** White text 4.5:1 (hover 6.1:1). The `Button` default variant and `Progress` use it |
| `primary` = `ring` | #03722E (green-700) | links, selected and active states, focus ring. 5.5:1 on cream |
| `forest` | #004225 (green-900) | headings on cream, dark feature sections |
| `forest-2` | #00311B (green-950) | footer, deepest bands, player frames |
| `brand-950/900/800/700/500` | #00311B #004225 #025129 #03722E #1AB210 | the motif greens. **500 is for the motif only**, never text or buttons |
| `foreground` (`olive-ink`) | #3F4130 | body text and secondary headings |
| `olive` | #4E5B35 | small accents, icons |
| `background` (`cream`) | #F7F4EA | page canvas · `card` #FFFFFF panels |
| `leaf` = `accent` (`mint`) | #ECF7EC | highlight panels, outcome lists, hover rows |
| `flame` | mint | accents on dark surfaces only |
| `muted-foreground` | #6B6B5C | secondary text (4.9:1 on cream, 5.4:1 on white) |
| `border` / `input` | #E3DECF / #D6D0BE | hairlines / field borders |
| `success` | #1A7051 | paid, passed, completed |
| `warning` / `destructive` / `info` | #93560A / #C0392B / #1A5B8F | status only |
| `cover-*` | see "Course covers" | generated course covers |
Removed: navy, electric blue (`royal` now aliases green-700) and the grey-beige canvas.
Dark-mode values exist under `.dark` (not exposed in UI yet).

**Ratio rule:** orange only where something is pressed or filled; status = icon + text + colour, never colour alone.

## Typography
League Spartan 600/700 for `h1` to `h3`, `font-display` and `.text-poster`, in sentence case; Inter 400 to 700 for
everything else. Both self-hosted (`@fontsource`, Latin + Latin-ext, `font-display: swap`).
Body line height 1.6; public pages use 16 to 18 px body. `.text-page-title` 24→28/700 · `.text-section-title` 18/600 ·
`.text-card-title` 16/600 Inter · `.text-meta` 13/20 · `.tabular` for prices, durations and figures.

## Space, radius, elevation
4-px grid (Tailwind). One content width for every public page: `max-w-site` (1264 px, 1200 px of content inside
`lg:px-8`); gutters 16/24/32 px. `.site-grid` is the 12-column grid (4 on phones, 8 on tablets, 12 from 1024 px).
**One radius: 8 px** (`rounded-lg` = `xl` = `2xl` = `3xl`); pills and avatars stay round.
Elevation: hairline borders on the page; `--shadow-float` only on layers that float (menus, dialogs, popovers).

## Logo
`<Brand>` (`src/components/shell/Brand.tsx`) shows the official lock-up: target, dart, "DATA+", "ACADEMY".
No SVG was supplied, so `public/brand/dataplus-academy-logo(-light).webp` and the compact mark are cut from the
intro poster frame with the background made transparent. **Replace with the official SVG when DATA+ sends it.**

## Plus motif
`<PlusMotif variant="trail|centred|stepped" size tone="light|dark" animate={false|"once"|"loop"} layersLit={0..3}>`
in `src/components/brand/PlusMotif.tsx`, hand-built SVG traced from `assets-src/brand/*.png` (the PNGs are never shipped).
Layers are inner first; on dark backgrounds the outer layer turns mint at 60%. "once" draws inner first, 120 ms apart,
900 ms each; "loop" (loading) is 1.2 s. Both are off under reduced motion. Helpers: `PlusLevel` (course level),
`PlusLoader` (route loading), `PlusMark` (solid list marker).
Allowed places, and nowhere else without asking: hero (trail) · course level indicator (centred, 20 to 24 px) ·
course progress for enrolled learners (centred) · capstone steps (stepped) · certificate preview seal (centred) ·
section markers, at most three on the home page, and page-header accents (stepped, 28 px) · final call-to-action band
(centred, 8 to 12% opacity) · loading and route transitions (centred loop) · empty states and 404 (trail) ·
outcome lists (solid mark) · generated course covers (stepped).
Rules: one large motif per screen; never behind body text; brightest green only inside the motif.
Built in Phase 2: level indicator on catalogue cards, route loading, covers. The other places arrive with Phases 3 and 4.

## Course covers
`<CourseThumb title category compact?>` (`src/features/learning/CourseThumb.tsx`) generates every course tile from data:
the subject family (`coverFamily()`, category first, then title; tested in `tests/coverFamily.test.mjs`) picks the tint,
the title is set in League Spartan, and a stepped plus is cut by the right edge. No dates, no uploaded posters.
| Family | Token | Text |
|---|---|---|
| Data analysis (default) | `cover-data` green-900 | cream |
| Monitoring and evaluation | `cover-me` light green | green-900 |
| AI for professionals | `cover-ai` green-950 | cream |
| Research and proposals | `cover-research` green-700 | cream |
| Geospatial | `cover-geo` light olive | green-900 |
`compact` (tiles beside a title) keeps tint and motif without text.

## Intro
`<BrandIntro>` (`src/features/site/BrandIntro.tsx`, rules in `introPolicy.ts`, tested) on the home page only:
first visit in a browser session (`sessionStorage`), signed-out visitors, not under reduced motion or Save-Data.
A fixed overlay above the rendered page; WebM with alpha on cream, or the MP4 on white for Safari and iOS
(`canPlayType` plus a WebKit check). "Skip intro", any click, tap, Escape, wheel, touch scroll or scroll key ends it;
it fades out over 400 ms at 3.4 s and is dropped if the video has not started within 800 ms. It fires
`dataplus:intro-end` for the hero entrance. **Off until the videos exist:** put `dataplus-academy-intro.webm` and
`.mp4` in `public/brand/intro/` and set `siteFacts.brand.intro.ready` to `true`.

## Reference page
`/brand` (development and demo builds only) shows tokens, type, logo, motifs, covers and an intro preview.

## Components and patterns
- **Shell**: left sidebar (canvas colour, active item = white card), 64-px top bar, learner phone tab bar.
- **PageHeader** title + description + one primary action. **SectionHeader** title + text link.
- **StatusPill** tones neutral/green/brand/amber/red/blue/forest, always with label.
- **StatusTimeline** (Clearbill pattern): numbered markers; done = ink check, current = green ring (spinner while waiting), blocked = red ×; horizontal ≥ 640px, vertical below; `aria-current="step"`, state in screen-reader text.
- **JourneyCard**: header + pill, timeline, tinted callout with explanation and one action.
- **Details panel** (Northstar pattern): label/value rows with dividers (track and competition sidebars).
- **EmptyState / ErrorState / SkeletonBlock** for every list.
- Forms: label above, hint below, `aria-invalid`, inline counters (feedback).
- Tables: eyebrow header row, divided rows, right-aligned numbers.

## Photos and screenshots
`<Photo name>` (`src/features/site/home/Photo.tsx`) serves `public/images/home/{name}-{480|960|1600}.{avif|webp}` with
`srcset`, `sizes`, width and height. Originals live in `assets-src/photos` and `assets-src/screenshots`; each output is
under 200 KB. Never stock or generated people; alt text says what is visible without naming anyone.

## Motion
Home reveals use one IntersectionObserver (`useReveal`, callback ref; observe an unclipped wrapper): 600 ms, once.
The plus-shaped mask (900 ms) is used on the hero photo and one capstone photo only.
150 to 220 ms ease-out; page fade-in once; progress grows once; spinner only for "waiting" states; plus draw-in once;
all disabled under `prefers-reduced-motion`.

## Responsive
Breakpoints sm 640, md 768, lg 1024. Two-column detail layouts collapse under lg; timelines go vertical under sm;
touch targets ≥ 44 px for onboarding choices and tab bar.
