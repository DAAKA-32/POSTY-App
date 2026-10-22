# Admin analytics — acquisition, funnel & attribution

Private dashboard at **`/admin/analytics`**. First-party, Firestore-backed, no new analytics vendor.

## Architecture (hybrid, first-party)

| Layer | What | Where |
|---|---|---|
| Browser tracker | page_view + intent events, consent-gated | `lib/analytics/tracker.ts`, `components/analytics/AnalyticsTracker.tsx` |
| Ingestion | validates, rate-limits, classifies source server-side | `app/api/analytics/event/route.ts` |
| Signup link | verifies a real new account, links first-touch | `app/api/analytics/identify/route.ts` |
| Billing events | Stripe-signed webhook + checkout route only | `app/api/stripe/webhook/route.ts`, `app/api/stripe/checkout/route.ts` |
| Planner (pure) | what to write for one event | `lib/analytics/plan.ts` |
| Writer | transaction + counters | `lib/analytics/ingest.ts` |
| Source rules | referrer / UTM / click-id classification | `lib/analytics/attribution.ts` |
| Report maths | KPIs, cohort funnel, CSV | `lib/analytics/report.ts` |
| Admin API | report, feed, journey, export | `app/api/admin/analytics/*` |
| UI | `components/admin/analytics/*`, `app/(app)/admin/analytics/page.tsx` |

The previous counter-only tracker is **extended, not duplicated**: it wrote `analytics_daily/{day}`; the new pipeline writes the same doc (legacy fields `pageviews`, `uniqueVisitors`, `pathHits`… are still maintained, so the original `/admin` chart keeps working). `POST /api/analytics/track` is kept for stale cached clients; the new tracker no longer calls it.

## Administrator access

* Allowlist in `lib/admin.ts` (`ADMIN_EMAILS = ["emilien.nepveu@gmail.com"]`) — server-side constant, not a Firestore field, not a client flag.
* Every admin endpoint calls `guardAdmin` → `requireAdmin`: verifies the **Firebase ID token** with the Admin SDK, requires `email_verified`, compares the *token's* email (case-insensitive, exact — no wildcard/domain matching). Anything else → an identical `404 {"error":"not_found"}` (no 401/403, so the route's existence is not revealed).
* The page itself ships no data; on a 404 from the API it renders Next's not-found page.
* No endpoint grants or edits admin rights. To add an admin, edit `ADMIN_EMAILS` and deploy.
* **Provisioning for Emilien:** nothing to run. Sign in to Posty with `emilien.nepveu@gmail.com` (Google sign-in is verified by default; with email/password the address must be verified) and open `/admin/analytics`. No custom claim is used, so there is no token-refresh step.
* Firestore rules deny every client read/write on `analytics_*` (explicitly, plus the default deny). Only the Admin SDK touches them.

## Time & aggregation

All daily aggregation is **UTC calendar days** (`YYYY-MM-DD`); both range bounds are inclusive. The dashboard says so in its header. The dashboard is **not live**: it shows "updated X ago" and the age of the newest aggregated event, with a manual refresh button.

## Event taxonomy & trust levels

| Trust | Who can emit | Events |
|---|---|---|
| `client` | any browser (consent required) | `page_view`, `pricing_page_view`, `feature_page_view`, `faq_interaction`, `cta_click`, `plan_view`, `plan_click`, `signup_started` |
| `client_authed` | browser **with a verified ID token** (user-asserted product usage) | `login_completed`, `onboarding_started`, `onboarding_completed`, `business_profile_completed`, `strategy_plan_approved`, `post_created`, `post_scheduled`, `post_published`, `post_publish_failed`, `marketing_strategy_created` |
| `server` | our backend only; the ingestion route refuses them from a browser | `signup_completed`, `first_content_created`, `first_post_published`, `trial_started`, `checkout_started`, `subscription_created`, `subscription_renewed`, `subscription_cancelled`, `payment_failed` |

* `landing_page_view` is not a separate event: the landing page of a session is a dimension of its first `page_view`.
* `free/pro/max_plan_click` are one `plan_click` with a normalized `plan` property (`free|pro|max`) and optional `interval`.
* `first_content_created` / `first_post_published` are **derived server-side** from the first `post_created` / `post_published` of an account (activation = first content created).
* `login_completed` is wired in the e-mail and Google sign-in paths (`contexts/AuthContext.tsx`). `strategy_plan_approved` fires when a user approves a Strategist plan (`BatchPlanCard`) — the product's only real approval step.
* **Not an event:** `first_post_approved`. Posts are not approved individually in Posty; approval applies to a Strategist *plan*, which is `strategy_plan_approved`. Not mapped onto the post name on purpose (it would mislabel the data). `subscription_*` is not emitted for gifted/founder accounts (no payment).
* Plan click ≠ checkout ≠ payment: `plan_click` (browser) → `checkout_started` (created only after the Stripe session exists, deduped on the session id) → `subscription_created` (only from a signed Stripe `invoice.paid` with `amount_paid > 0`, deduped on the invoice id). A first real payment is always `subscription_created`, even when Stripe labels it a renewal (post-trial). Revenue is taken only from those verified invoice amounts and is **gross of refunds**.

Event payloads: strict zod schema (`lib/analytics/events.ts`), body ≤ 4 KB, ≤ 8 props, strings ≤ 100 chars, bounded path vocabulary (`normalizePath`: IDs and queries never reach the store), server clock authoritative, UA used only to drop bots and never stored.

## Attribution rules

Per session, first rule that yields a source wins:

1. `utm_source` (aliases normalized: `ig→instagram`, `chatgpt.com→chatgpt`, `paid_social→cpc`, …)
2. paid click ids (`gclid`→google/cpc, `msclkid`→bing/cpc, `ttclid`→tiktok/cpc; presence flag only)
3. recognized referrer — search engines, **AI assistants** (ChatGPT, Perplexity, Claude, Gemini, Copilot, …), social (TikTok, Instagram, LinkedIn, YouTube, Reddit, Facebook, X, …), webmail
4. unrecognized external site → `<domain> / referral`
5. no referrer → `direct / none`
6. unreadable referrer → `unknown / none`

`utm_campaign/content/term` ride along. Domains match exactly or as a true subdomain — `example-chatgpt.com` and `chatgpt.com.evil.io` are **not** ChatGPT. Our own domain and auth/payment hops (Stripe Checkout, Google OAuth) are not acquisition.

* **First touch** (the visitor's first session) is frozen and never overwritten. **Session source** is classified per session. **Latest non-direct touch** is kept on the visitor but direct/unknown never replace it.
* Signup → first-touch link: `identify` reads the visitor's stored first touch (never a client-supplied one). Paid revenue/conversions are credited to the first touch ("arrival cohort").
* The browser sends raw signals (referrer **origin only**, UTM strings, click-id booleans); the server classifies. A browser can't claim a source.
* **Honest limit:** AI assistants and many apps strip the referrer → those visits are `direct / none`. We never infer "ChatGPT" from behavior. For reliable AI attribution, share tagged links: `https://postyapp.ai/?utm_source=chatgpt.com&utm_medium=referral&utm_campaign=<name>`.

## Metric definitions

* **Sessions** — new sessions (30 min idle rule).
* **Visitors (per day)** — Σ over days of distinct visitors; one person on 3 days counts 3. Deliberately *not* labelled "unique visitors" on multi-day ranges. **New visitors** = first visit in the period (exact).
* **Cohort funnel** — of visitors who *first arrived* in the period, how many have reached each stage so far (stages are written to the arrival day). All conversion rates use cohort counts only (e.g. `visitor→signup = cohort signups / cohort new visitors`). Recent cohorts are immature. Stages are "reached at least once", not strictly sequential.
* **Engaged session** — ≥ 2 page views or ≥ 1 of: plan click, CTA click, FAQ, signup start.
* **Attribution coverage** — signups linked to a visitor ÷ all signups. The "Inscriptions" tile counts server-verified `signup_completed`; the sub-label shows total accounts created from the `users` collection (consent or not).
* Unmeasured, shown as *unavailable* (not 0): average session duration, CPA/ROAS (no ad-spend data), refund-adjusted revenue.

## Privacy & consent

* **Nothing is stored or sent before the visitor accepts "analytics"** in the cookie banner; Global Privacy Control forces off. Pre-consent landing signals live in JS memory only; on consent the current page is reported at once. Withdrawing consent erases `posty_vid` / `posty_sid`.
* This **fixes a pre-existing gap**: the old tracker set `posty_vid` in localStorage regardless of consent.
* Identifiers: random visitor id + session id. No IP, no UA, no fingerprinting. Country = coarse edge header (`x-vercel-ip-country`), the IP is never read or stored.
* Account creation is counted even without consent (operational), with **no visitor id** → "unattributed".
* The dashboard masks references (`v_ab12cd…`, `u_…`); no emails, no content. Exports are aggregate-only and audited (`analytics_admin_audit`, 2-year TTL); session-journey views are audited too.
* **Retention:** events, visitors, sessions: 13 months, enforced by a daily purge (`/api/cron/analytics-retention`, `lib/analytics/retention.ts`) — Firestore's native TTL can't be enabled while the project has billing disabled. Aggregates are anonymous counters, kept. `deleteAnalyticsForUser(db, uid)` (`lib/analytics/ingest.ts`) erases everything tied to an account/visitor.
* **Account deletion** calls `POST /api/analytics/delete` (uid taken only from the verified token) *before* the Auth account is removed, so the token is still valid: it erases the account's visitors (incl. other devices), sessions, events and funnel link. Best effort with one retry; if it fails the records are still removed by the daily 13-month purge.
* **Policies updated** (`lib/i18n/legal.ts`, privacy and cookies v2.1, 2026-10-22; the version bump triggers the existing `LegalUpdateNotification`): data collected, purposes, legal basis (consent), retention (13 months), erasure on deletion, `posty_vid` / `posty_sid` in the cookie table, Global Privacy Control. The cookie-banner label no longer says "anonymous" (it is pseudonymous) in all 10 languages. The legal pages are English-only by design.

## Tagged links

AI assistants, many apps and some browsers send no referrer, so an untagged link is recorded as `direct / none`. A tagged link sets the source explicitly (highest-priority rule). The dashboard has a **link builder** (section "Liens balisés") that normalises values exactly as the server does, previews how the visit will be recorded, and only allows `https://postyapp.ai` targets. Ready-to-use links (campaign `evergreen` — replace it with a real campaign name per placement, and add `utm_content` to tell posts apart):

| Channel | Link | Recorded as |
|---|---|---|
| ChatGPT | `https://postyapp.ai/?utm_source=chatgpt.com&utm_medium=referral&utm_campaign=evergreen` | chatgpt / referral |
| Perplexity | `https://postyapp.ai/?utm_source=perplexity&utm_medium=referral&utm_campaign=evergreen` | perplexity / referral |
| Claude | `https://postyapp.ai/?utm_source=claude&utm_medium=referral&utm_campaign=evergreen` | claude / referral |
| Gemini | `https://postyapp.ai/?utm_source=gemini&utm_medium=referral&utm_campaign=evergreen` | gemini / referral |
| LinkedIn (post) | `https://postyapp.ai/?utm_source=linkedin&utm_medium=social&utm_campaign=evergreen` | linkedin / social |
| LinkedIn (pub) | `https://postyapp.ai/?utm_source=linkedin&utm_medium=cpc&utm_campaign=evergreen` | linkedin / cpc |
| Instagram (bio / story) | `https://postyapp.ai/?utm_source=instagram&utm_medium=social&utm_campaign=evergreen` | instagram / social |
| TikTok (bio) | `https://postyapp.ai/?utm_source=tiktok&utm_medium=social&utm_campaign=evergreen` | tiktok / social |
| YouTube (description) | `https://postyapp.ai/?utm_source=youtube&utm_medium=social&utm_campaign=evergreen` | youtube / social |
| Reddit | `https://postyapp.ai/?utm_source=reddit&utm_medium=social&utm_campaign=evergreen` | reddit / social |
| X | `https://postyapp.ai/?utm_source=x&utm_medium=social&utm_campaign=evergreen` | x / social |
| Newsletter | `https://postyapp.ai/?utm_source=newsletter&utm_medium=email&utm_campaign=evergreen` | newsletter / email |
| E-mail de prospection | `https://postyapp.ai/?utm_source=outreach&utm_medium=email&utm_campaign=evergreen` | outreach / email |
| Partenaire / affilié | `https://postyapp.ai/?utm_source=partner&utm_medium=affiliate&utm_campaign=evergreen` | partner / affiliate |

Round-trip tests guarantee each of these is classified as shown even with no referrer. Partner links: replace `partner` with the partner's name. Use one link per placement; never reuse a paid-ads link for organic posts.

## Deployment checklist

1. **Done on 2026-10-22:** `firebase deploy --only firestore:rules` (explicit deny on `analytics_*`, verified in the released ruleset) and `firestore:indexes` (2 composite indexes on `analytics_events`; they build in the background — the feed's event-type filter and the session journey work once they are READY). TTL policies were **not** applied (billing disabled → 403); retention is the daily purge below.
2. Deploy the app so `vercel.json` registers the new daily cron (`30 3 * * *` → `/api/cron/analytics-retention`; needs the existing `CRON_SECRET` env var, already used by the scheduler). No other new variables. Existing: Firebase Admin credentials, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY` (webhook).
3. Make sure the Stripe webhook is subscribed to `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` (already the case).
4. Deploy the Next.js app (Vercel). Sign in as `emilien.nepveu@gmail.com`, open `/admin/analytics`.
5. Create tagged links for each channel you want measured (`utm_source`, `utm_medium`, `utm_campaign`).

## Tests

`npx vitest run __tests__/analytics` — attribution rules, the ingestion planner (first-touch immutability, dedupe, plan≠payment, webhook replay, unattributed stays unattributed), report maths, ranges, CSV injection, schema, admin authorization on every endpoint, and the ingestion trust boundary.
`__tests__/emulator/analytics-rules.test.ts` — Firestore rules; needs the emulator (Java ≥ 21).

## Known limitations

* Consent-gated tracking, blockers and GPC mean numbers are **minimums**.
* Counters are applied after the event transaction: a crash between the two under-counts one event; it never double-counts.
* Summed daily visitors ≠ unique people over a multi-day range (by design, labelled).
* Revenue is gross of refunds; multi-currency revenue is shown per currency, never summed.
* Feed: only the event-name filter is a Firestore query; source/plan/anonymous/status filters scan up to 6 pages per request, so very rare filters may return a partial page with a "load more" cursor.
* `first_post_approved` does not exist as an event (see taxonomy).
* Erasure on account deletion is best effort (one retry); on failure the daily purge removes the records within 13 months.
