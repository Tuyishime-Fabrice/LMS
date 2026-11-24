# Design system

Implemented in `src/index.css` (tokens) and `tailwind.config.ts`; shared pieces in
`src/components/shell/page.tsx`, `src/features/enrolment/StatusTimeline.tsx`, shadcn `src/components/ui`.

## Colour (HSL tokens; names are historical)
| Token | Hex | Use |
|---|---|---|
| `primary` | #4B6929 | DATA+ green from the logo. Primary buttons, links, active nav icon, progress. White text 6.3:1 |
| `primary-hover` | #3D5A1F | hover/pressed |
| `forest` | #1F271C | ink: headings, dark hero, "done" timeline markers |
| `flame` | #A6CB6A | accent **on dark surfaces only** |
| `leaf` / `leaf-foreground` | #EEF3E6 / #3D5A1F | selected/highlighted backgrounds |
| `background` | #F5F5F2 | app canvas · `card` #FFFFFF panels |
| `muted-foreground` | #5B6257 | secondary text (≥ 5.5:1 on white) |
| `border` / `input` | #E2E3DC / #CACBC2 | hairlines / field borders |
| `success` | #1A7051 | paid, passed, completed (emerald — never the brand green) |
| `warning` | #93560A | due soon, action needed |
| `destructive` | #C0392B | errors, rejected, delete |
| `info` = `royal` = `ring` | #1F64B8 | information, focus ring |
Dark-mode values exist under `.dark` (not exposed in UI yet).

**Ratio rule:** green on ≤ 10% of a screen; status = icon + text + colour, never colour alone.

## Typography
Inter only (self-hosted, Latin + Latin-ext). Bebas Neue removed from the product.
`.text-page-title` 24→28px/700 · `.text-section-title` 18/600 · `.text-card-title` 16/600 ·
body 15/24 · `.text-meta` 13/20 muted · `.text-eyebrow` 11/600 uppercase +0.08em (sidebar groups, stat labels) ·
`.tabular` for numbers.

## Space, radius, elevation
4-px grid (Tailwind). Page gutter 16/24/32; content max 72rem (`wide` 88rem). Radius base 10px
(`rounded-lg`), panels `rounded-xl`, pills full. Elevation: `.surface` = white + hairline + `--shadow-raised`;
`--shadow-float` only for hover and overlays.

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

## Motion
150–220 ms ease-out; page fade-in once; progress grows once; spinner only for "waiting" states;
all disabled under `prefers-reduced-motion`.

## Responsive
Breakpoints sm 640, md 768, lg 1024. Two-column detail layouts collapse under lg; timelines go vertical under sm;
touch targets ≥ 44 px for onboarding choices and tab bar.
