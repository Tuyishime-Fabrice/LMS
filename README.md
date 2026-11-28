# DATA+ Academy LMS

Product rules: [CLAUDE.md](CLAUDE.md) · product docs: [docs/product](docs/product/).

Learning platform for DATA+ Academy: courses with cohorts, live sessions, quizzes, assignments and capstone projects, certificates, Mobile Money payments, and an AI tutor. English and French.

## Stack

| Part | Technology |
|---|---|
| Web app | Vite, React 18, TypeScript, React Router, Tailwind, shadcn/ui |
| Data, auth, files | Supabase (PostgreSQL with row-level security, Auth, Storage) |
| Server functions | Vercel serverless functions in `api/` (payments, AI tutor) |
| Payments | XentriPay (MTN MoMo / Airtel, RWF); LMBTech optional |
| AI tutor | Claude API through `@anthropic-ai/sdk` |
| Languages | `src/i18n/locales/en.json` and `fr.json` |

## Run it locally

Requires Node 22 or newer.

```bash
npm ci --ignore-scripts
```

```bash
cp .env.example .env
```

Fill in `.env` (at least `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; there is no built-in project), then start the web app and the API in two terminals:

```bash
npm run dev
```

```bash
npm run dev:api
```

The web app is at http://localhost:8080 and proxies `/api` to the API on port 3001.

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

`npm run lint` still reports errors in older files (mostly `any`); new code is lint-clean. The Verify workflow in `.github/workflows` runs tests and the build on `main`, `claude/**` and pull requests.

## Database

**New project:** follow [docs/supabase-setup.md](docs/supabase-setup.md). It runs one file, `supabase/setup.sql`, in the Supabase SQL Editor and then connects the site.

**Existing project:** migrations are in `supabase/migrations`. Do not replay the whole folder on a database in use: the historical order is inconsistent. Apply new migrations one at a time: take a backup (Supabase Dashboard → Database → Backups), open SQL Editor, paste the file, run it, in the order below. Each of these is additive and safe to run more than once:

| File | What it adds |
|---|---|
| `20261112000000_security_hardening.sql` | Stops users changing their own role or price tier, server-marked quizzes, protected grades |
| `20261112000100_learning_experience.sql` | Resume point, calendar fields, notifications, automatic certificates |
| `20261113000000_ai_tutor.sql` | `tutor_messages` table for the AI tutor |
| `20261118000000_exhibition_projects.sql` | The student exhibition table and image bucket, which the exhibition pages already used |
| `20261118000100_realtime_tables.sql` | Live updates for messages, notifications and announcements |
| `20261118000200_lesson_files_access.sql` | Lesson files follow lesson access: no longer readable by anyone signed out, by learners of other courses, or by unapproved teachers |
| `20261124000000_academy_experience.sql` | Discord links, skill/career tracks, competitions, onboarding preferences with research consent, rubrics, written feedback required with every mark, grade history. After this, a mark cannot be saved without a 20-character comment |
| `20261125000000_facilitators.sql` | Facilitators assigned per course or cohort, provisional reviews for instructors, and a fix so only course staff can post course announcements. Apply after the previous one |
| `20261126000000_drafts_and_cohort_announcements.sql` | Announcements for one cohort (only that cohort reads and is notified), facilitator assignment drafts that the instructor approves or returns, and announcement edits limited to where the author may post. Apply after the facilitators migration |
| `20261127000000_listing_and_verification.sql` | `courses.listed` (admin-only switch that hides a course from the public catalogue and landing) and `exhibition_projects.outcomes_verified` (admin-only switch that shows scores and outcome text on the public projects page). Existing courses stay listed; existing projects start unverified |

The app tolerates a database where the first two are not applied yet (the new features stay hidden or fall back), but the redesigned learner pages need them to work fully.

`supabase/setup.sql` is generated from the migrations; do not edit it by hand. After adding a migration, regenerate and check it against a disposable local Postgres:

```bash
scripts/build-supabase-setup.sh postgresql://postgres@127.0.0.1:5432
```

```bash
scripts/check-supabase-setup.sh postgresql://postgres@127.0.0.1:5432
```

The check runs `setup.sql` on an imitation of a new Supabase project (`supabase/setup-build/supabase_stub.sql`) and then the behaviour tests in `supabase/tests`. Those tests are for a scratch database only, never production.

After a schema change, update `src/integrations/supabase/types.ts` (regenerate from the live project when you have access).

## Demo mode

The app can run entirely in the browser with sample data, without Supabase or any server key. Use it to show the product or test the interface.

| Account | Email | Password |
|---|---|---|
| Learner (Aline Uwase) | `aline@dataplus-demo.test` | `demo1234` |
| Instructor (Théo Mugisha) | `theo@dataplus-demo.test` | `demo1234` |
| Admin (Grace Ingabire) | `admin@dataplus-demo.test` | `demo1234` |
| Facilitator (Diane Mutesi, Cohort 3) | `diane@dataplus-demo.test` | `demo1234` |

The sign-in page also has one-click buttons for each, and a **Demo** button in the corner switches account or resets the data.

The sample academy has four courses (one free and in French, one awaiting approval), a cohort with live sessions and a Kigali workshop, quizzes, graded and pending submissions, a certificate you can verify (code `K7QX4M2P`), messages, instalments and payments. Mobile Money checkout is simulated: the payment confirms itself after a few seconds and enrols the learner. The AI tutor gives a fixed sample answer, labelled as such. Changes are kept in that browser only.

Run it locally:

```bash
VITE_DEMO_MODE=true npm run dev
```

If the machine has no IPv6, add `-- --host 127.0.0.1`.

Build a static copy (hash URLs, relative paths) into `dist-demo/`:

```bash
npm run build:demo
```

To put the demo on Vercel, set `VITE_DEMO_MODE=true` in that project's environment variables. Never set it on the real site: it replaces the database with sample data. The data lives in `src/demo/seed.ts` and the stand-in backend in `src/demo/backend.ts`; a normal build contains neither.

## AI tutor

Learners open **Help** inside a lesson and ask the tutor a question. It answers in the learner's language, knows which lesson they are on, and gives hints instead of answers on graded work.

To switch it on:

1. Apply `20261113000000_ai_tutor.sql`.
2. Add `ANTHROPIC_API_KEY` to the server environment (Vercel → Settings → Environment Variables). It must not start with `VITE_`.
3. Redeploy.

Without the key the tutor is simply hidden.

| Setting | Default | Meaning |
|---|---|---|
| `TUTOR_MODEL` | `claude-opus-5-5` | Model that answers. `claude-sonnet-5-5` or `claude-haiku-5-5` cost less per answer. |
| `TUTOR_DAILY_LIMIT` | `30` | Questions per learner per 24 hours |

Every question and answer is stored in `tutor_messages` with the model and token counts, so usage and cost can be reviewed. Learners can read only their own conversation; admins can read all of them.

The tutor sees lesson titles, descriptions and objectives. It does not see the video or PDF content.

## Design

Tokens live in `src/index.css` and `tailwind.config.ts`; the full system is in [docs/product/DESIGN_SYSTEM.md](docs/product/DESIGN_SYSTEM.md). DATA+ green `#4B6929` (from the logo) for actions and progress, green-tinted ink `#1F271C`, neutral canvas `#F5F5F2` behind white panels, emerald for success, blue for focus. One typeface: Inter, bundled.

Public pages share `src/features/site` (header, footer, discovery layout). Signed-in pages share `src/components/shell`. Company pages (about, contact) live on the corporate site set by `VITE_CORPORATE_SITE_URL`.

## Notification emails

Grades, submission receipts, applications and certificates are queued as emails by the database. `/api/send-notification-emails` sends the queue through [Resend](https://resend.com) and marks each one sent, failed or skipped.

1. Create a Resend account and verify the sending domain.
2. In Vercel, set `RESEND_API_KEY`, `EMAIL_FROM` (for example `DataPlus Academy <notifications@dataplusacademy.com>`) and `CRON_SECRET` (any long random string).
3. Redeploy.

`vercel.json` runs the sender once a day, the most often a Vercel Hobby plan allows. On a Pro plan change the schedule to `*/10 * * * *`. Without the key nothing is sent and notifications stay in the app.

## Installable app

The site has a web app manifest and a service worker (`public/sw.js`), so learners can add it to their phone's home screen and the interface opens without a connection. Pages are fetched from the network first, so a new deployment shows up immediately. Lesson videos and documents are not stored offline.

## Payments

`api/payment-*.js` and `server/lib` implement checkout through XentriPay, with coupons, bundles, instalments, scholarships and early-bird pricing. Card payments are behind `VITE_CARD_PAYMENT_ENABLED`. See `.env.example` for the variables and `docs/checkout-repair.md` for the Supabase redirect settings that checkout depends on.

## Where things are

| Path | Contents |
|---|---|
| `src/components/shell` | Layout shared by every signed-in page: sidebar, top bar, page header, empty and error states |
| `src/features` | Learning room, calendar, certificates, assignments, messages, settings, tutor |
| `src/pages` | One file per route; learner, instructor and admin areas |
| `src/index.css` | Design tokens. Colours are changed here only |
| `api`, `server/lib` | Serverless functions and their helpers |
| `tests` | Node tests for checkout, auth storage, the tutor, and the journey, track, competition, rubric and Discord-link rules |

## Security note

The original project archive contained a hidden loader in two build files. It was removed (see `docs/checkout-repair.md`). Any Supabase service key, payment key or deployment token that existed before that removal should be rotated.

## Not built yet

- Payments outside Rwanda (XOF/XAF and other operators). This needs a choice of payment provider first.
- A native mobile app. The installable web app covers phones for now.
- Lessons available offline (videos and documents).
