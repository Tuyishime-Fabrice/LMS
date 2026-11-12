# DataPlus Academy LMS

Learning platform for DataPlus Academy: courses with cohorts, live sessions, quizzes, assignments and capstone projects, certificates, Mobile Money payments, and an AI tutor. English and French.

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

Fill in `.env`, then start the web app and the API in two terminals:

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

Migrations are in `supabase/migrations`. Do not replay the whole folder on an existing database: the historical order is inconsistent. Apply new migrations one at a time.

These three are the newest. Each is additive and safe to run more than once:

| File | What it adds |
|---|---|
| `20261112000000_security_hardening.sql` | Stops users changing their own role or price tier, server-marked quizzes, protected grades |
| `20261112000100_learning_experience.sql` | Resume point, calendar fields, notifications, automatic certificates |
| `20261113000000_ai_tutor.sql` | `tutor_messages` table for the AI tutor |

To apply one: take a backup (Supabase Dashboard → Database → Backups), open SQL Editor, paste the file, run it. Apply them in the order above.

The app tolerates a database where they are not applied yet (the new features stay hidden or fall back), but the redesigned learner pages need the first two to work fully.

`supabase/tests` holds behaviour checks for these migrations. They are for a scratch database only, never production.

After a schema change, update `src/integrations/supabase/types.ts` (regenerate from the live project when you have access).

## Demo mode

The app can run entirely in the browser with sample data, without Supabase or any server key. Use it to show the product or test the interface.

| Account | Email | Password |
|---|---|---|
| Learner (Aline Uwase) | `aline@dataplus-demo.test` | `demo1234` |
| Instructor (Théo Mugisha) | `theo@dataplus-demo.test` | `demo1234` |
| Admin (Grace Ingabire) | `admin@dataplus-demo.test` | `demo1234` |

The sign-in page also has one-click buttons for each, and a **Demo** button in the corner switches account or resets the data.

The sample academy has four courses (one free and in French, one awaiting approval), a cohort with live sessions and a Kigali workshop, quizzes, graded and pending submissions, a certificate you can verify (code `K7QX4M2P`), messages, instalments and payments. Mobile Money checkout is simulated: the payment confirms itself after a few seconds and enrols the learner. The AI tutor gives a fixed sample answer, labelled as such. Changes are kept in that browser only.

Run it locally:

```bash
VITE_DEMO_MODE=true npm run dev
```

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
| `tests` | Node tests for checkout, auth storage and the tutor |

## Security note

The original project archive contained a hidden loader in two build files. It was removed (see `docs/checkout-repair.md`). Any Supabase service key, payment key or deployment token that existed before that removal should be rotated.

## Not built yet

- Email delivery for notifications (the database queues them; nothing sends them)
- Installable app with offline lessons (PWA), then a native mobile app
- Payments outside Rwanda (XOF/XAF and other operators)
- French for the public pages: landing, about, contact, course detail, bundles, exhibition, onboarding, legal
