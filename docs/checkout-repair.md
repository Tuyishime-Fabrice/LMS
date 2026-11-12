# Checkout repair

Guest enrollment from the catalogue, course detail, or a bundle carries a validated `returnTo` through signup, login, verification, OAuth, and profile setup. Existing saved checkout state remains supported. Course/cohort/bundle selection is kept until the destination opens payment; consumed intent does not reopen the dialog on refresh. Email-confirmation settings remain enforced.

## Validation

Run `npm ci --ignore-scripts`, `npm test`, `npm run typecheck`, and `npm run build:vercel` with Node 24. The application types are now checked explicitly; the former root `tsc` invocation compiled no application files.

The browser test used a local Supabase fixture: guest catalogue enrollment, signup with no session, verification callback, all three onboarding steps, and course payment dialog at RWF 25,000. Existing-account login from a course detail page was also checked with cohort selection retained. Closing payment and refreshing did not reopen it. No production email or payment was sent. The seven automated tests cover checkout continuity, another-browser verification, storage restrictions, existing-account/bundle continuation, invalid redirects, role routing, and restricted auth storage.

The restored database types are an offline snapshot from the last valid generated file, repository migrations, and existing UI contracts. The live schema export requires privileged Supabase access. Regenerate against the live project to verify drift; do not run all historical migrations blindly because their chronological order is inconsistent. Repository lint still has pre-existing errors, predominantly `any` usage; it is not represented as passing.

## Production configuration to verify

In Supabase Authentication → URL Configuration, set Site URL to the active production origin and allow its `/auth/callback` including query parameters. For example, allow `https://dataplusacademy.com/auth/callback` and `https://dataplusacademy.com/auth/callback?*`. Keep preview/local wildcard entries limited to trusted hosts. A rejected redirect can fall back to Site URL and lose another-browser checkout intent. Custom confirmation-email templates must honor the supplied redirect URL. See https://supabase.com/docs/guides/auth/redirect-urls.

The browser supports optional `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` overrides. Only publishable/anon keys belong in `VITE_` variables. Payment server credentials belong only in server environment variables described in `.env.example`.

Netlify failed before building because Git tracked `.claude/worktrees/charming-cerf-11208f` as a submodule without a URL in `.gitmodules`. The accidental Git entry is removed and `.claude/worktrees/` is ignored to prevent recurrence. This is a confirmed Netlify checkout failure; it does not establish the cause of the separate Vercel failure.

The failed production Vercel deployment could not be inspected because the available CLI token was invalid. Verify the new deployment and its environment in the connected Vercel project. Real email verification, Google OAuth, and gateway settlement require production configuration and a controlled end-to-end check.

## Removed build compromise

`postcss.config.js` contained an obfuscated loader that discovered remote payload locations through Ethereum RPC, downloaded and decoded remote JavaScript, and executed detached Node processes. It was removed completely. The review did not execute or contact the loader and does not establish whether credentials were stolen.

Review previous affected build runs and rotate private Supabase, payment-provider, deployment, and other credentials exposed to those builds. Removing the loader does not rotate credentials or eliminate already-running processes. Public browser anon keys are not private service credentials.
