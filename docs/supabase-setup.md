# Setting up Supabase for DataPlus Academy

This connects the live site to its own database. It takes about 20 minutes. You need:

- a Supabase account (https://supabase.com, sign in with GitHub is fine)
- access to the Vercel project that hosts the site
- the file [`supabase/setup.sql`](../supabase/setup.sql) from this repository

Menu names below are as Supabase shows them today. If one is slightly different, look for the nearest match.

## 1. Create the project

1. In Supabase, click **New project**.
2. **Name**: `dataplus-academy`.
3. **Database password**: click **Generate a password** and save it in your password manager. You will not need it for the steps below, but you will need it for backups and some tools later.
4. **Region**: **Central EU (Frankfurt)**. Supabase has no region in Africa, and Frankfurt gives good speed from Rwanda.
5. Leave the security options as they are (Data API on).
6. Click **Create new project** and wait until it says the project is ready (1–2 minutes).

About the plan: the Free plan is fine to set up and test. Before real learners and payments, move to Pro. Free projects pause after a week without visits, have no daily backups, and limit uploads to 50 MB per file.

## 2. Create the database

1. Open [`supabase/setup.sql`](../supabase/setup.sql) on GitHub and click **Raw** (or **Copy raw file**).
2. Select everything and copy it.
3. In Supabase, open **SQL Editor** → **New query**.
4. Paste and click **Run**.
5. Supabase may warn that the query has destructive operations. That is expected: the script removes default rules before setting its own. Click **Run this query**.

After a few seconds the result shows **DataPlus Academy database is ready**.

To check: **Table Editor** lists 46 tables (`profiles`, `courses`, `payments`…), and **Storage** shows five buckets: `certificates`, `course-thumbnails`, `exhibition-images`, `lesson-files` (private), `testimonial-images`.

If it shows an error instead, nothing was saved and you can run it again after fixing the cause. Send me the error text. If it says *This project already has DataPlus tables*, the database was already created and you can go on.

## 3. Sign-in settings

**Authentication → URL Configuration**

- **Site URL**: `https://dataplusacademy.com` (your real domain)
- **Redirect URLs**: add each of these
  - `https://dataplusacademy.com/**`
  - `https://www.dataplusacademy.com/**` (only if the site also opens on www)
  - `http://localhost:8080/**` (for running the site on your own computer)

Without these, links in confirmation and password-reset emails send people to the wrong page.

**Authentication → Sign In / Providers → Email**: keep it enabled and keep **Confirm email** on.

**Emails**: Supabase's built-in sender only sends a few emails per hour. That is enough for testing, not for real sign-ups. Before launch, open **Authentication → Emails → SMTP Settings**, turn on custom SMTP and use Resend (the same account as the notification emails in the README):

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | `notifications@dataplusacademy.com` (on a domain verified in Resend) |
| Sender name | `DataPlus Academy` |

**Google sign-in** (optional): the sign-in page has a Google button. To make it work, create an OAuth client in Google Cloud Console with the redirect URI `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste its client ID and secret into **Authentication → Sign In / Providers → Google**. Until then, leave Google off; email sign-in works without it.

## 4. Copy the project's address and keys

In **Project Settings**:

- **Project URL**: shown under **Data API** (or the **Connect** button at the top). It looks like `https://abcdefghijklmnop.supabase.co`.
- **API Keys**:
  - **Publishable key** (`sb_publishable_…`). Public: it is meant to be in the browser.
  - **Secret key** (`sb_secret_…`). Click to reveal. Private: it can read and change everything.

If you see a **Legacy API keys** tab with `anon` and `service_role` keys, those work too. Use one pair, not a mix.

Do not paste the secret key into a chat, an email or a file in the repository.

## 5. Connect the site (Vercel)

In Vercel, open the project → **Settings → Environment Variables**. Add these for **Production** (and **Preview** if you use preview links):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (tick **Sensitive**) |
| `SITE_URL` | `https://dataplusacademy.com` |

Check that `VITE_DEMO_MODE` is **not** in the list. If it is, delete it: it replaces the database with sample data.

Then open **Deployments**, click the three dots on the latest deployment → **Redeploy**. This is required: the site reads the `VITE_` values when it is built, not while it runs.

## 6. Make yourself the admin

1. Open the site, click **Sign up**, and create an account with your own email.
2. Open the confirmation email and click the link.
3. In Supabase **SQL Editor** → **New query**, run this with your email:

```sql
update public.profiles
set role = 'admin', onboarding_completed = true
where email = 'you@example.com';
```

It should say `1 row affected`. If it says 0, the email does not match the one you signed up with.

4. On the site, sign out and sign in again. You now land on the admin dashboard.

New accounts can only ever be learners or teachers. Teachers wait for your approval under **Teacher approvals** in the admin menu. Only this SQL step, or an existing admin, can create another admin.

## 7. Check that it works

- [ ] In a private browser window, sign up as a learner: the confirmation email arrives and the link signs you in.
- [ ] As admin, create a course with one lesson and upload a PDF to it.
- [ ] Sign up as a teacher in another private window, then approve that teacher as admin.
- [ ] The learner enrols in a free course and can open its lesson.
- [ ] Signed out, the paid course's lesson files do not open.

## 8. Later, when you are ready

These are described in the [README](../README.md) and each needs only keys added in Vercel and a redeploy:

- **AI tutor**: `ANTHROPIC_API_KEY`
- **Notification emails**: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`
- **Mobile Money payments**: the `XENTRIPAY_…` variables in `.env.example`

## 9. Tell me when it is done

Send me the **Project URL** (it is not secret). I will then point the repository's `supabase/config.toml` at the new project and remove the old project's address, which the site still falls back to when the Vercel variables are missing.

## When something goes wrong

| What you see | What to do |
|---|---|
| Sign-up fails with *Database error saving new user* | Step 2 did not finish. Run `setup.sql` again. |
| The site still shows the sample academy (Aline, Théo, Grace) | `VITE_DEMO_MODE` is set in Vercel. Delete it and redeploy. |
| *Invalid API key*, or pages stay empty | A key was copied wrongly, or the site was not redeployed after step 5. |
| Email links open the wrong site or a "page not found" | Check the Site URL and Redirect URLs in step 3. |
| Confirmation emails do not arrive | Check spam. The built-in sender's hourly limit may be used up; set up SMTP (step 3). |
| An upload fails for a teacher | The teacher is not approved yet, or the file is over 50 MB on the Free plan. |

## Changing the database later

`setup.sql` is only for a new, empty project. Once the site is live, changes come as new files in `supabase/migrations`. Apply each one on its own in the SQL Editor, after a backup, as the README explains.

For developers: `setup.sql` is generated from the migrations by `scripts/build-supabase-setup.sh` and checked by `scripts/check-supabase-setup.sh`. Both need a disposable local Postgres. Regenerate it whenever a migration is added.
