# Integration decisions

## Practice environments (link-out first)
| Option | Account | Languages | Persistence | Mobile | Embedding | Cost | Decision |
|---|---|---|---|---|---|---|---|
| Google Colab | Google account to run | Python (R kernel possible) | user's Drive | usable, cramped | no official LMS embed | free tier, paid tiers | **Default for Python practice**; share notebook link, learner saves a copy |
| JupyterLite | none | Python (Pyodide), others limited | browser storage only | weak | static site, iframe-able if self-hosted | free, host as static files | **Default for zero-account practice**; host a DATA+ JupyterLite build later |
| GitHub (view/download) | none to read | any | user's repo | ok | no | free | starter files and datasets |
| Proprietary runner | — | — | — | — | — | high (security, ops) | **Not in this phase** |

Today a practice resource is a `url` lesson; it opens in a new tab. No tracking inside external tools is claimed.
Next: a `practice_url` + `starter_url` on lessons and an "Open practice environment" card with return-to-course.

## Community: Discord
Invites to non-Community servers expire after ≤ 30 days; Community servers allow non-expiring invites
(Discord support, "Invites 101"). Recommend one Community server per course with a channel per cohort and
non-expiring invites. No bot or API integration; links only.

## Payments
XentriPay (MTN/Airtel, RWF) via `api/payment-*` and webhook unchanged. LMBTech code retained. Status truth = webhook.

## AI tutor
Claude API via `api/tutor.js`, unchanged; hidden without `ANTHROPIC_API_KEY`.

## Email
Resend via `api/send-notification-emails.js`, unchanged (brand name/colours updated in template).
