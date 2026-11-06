# Remaining Functionality Audit

**Audit date:** 2026-11-06  
**Scope:** Current repository source, existing verification report, README, package scripts, environment variable names, models, routes, services, proxy, UI, and tests. No production database was queried or changed.

## Summary

The application has real MongoDB-backed member, billing, plan, coupon, and administrator flows. The payment path is explicitly a development demo adapter, not an actual gateway integration. As of this audit, targeted automated tests cover business rules and disposable MongoDB persistence. Public plan rendering and Clerk widget rendering were browser-checked on an isolated seeded database. Authenticated end-to-end member/admin workflows have not been established, so the system is not considered end-to-end verified.

This audit records the current source behavior, not a claim that untested features pass acceptance. The related [functionality verification report](./FUNCTIONALITY_VERIFICATION_REPORT.md) is the evidence record.

## Project and runtime inventory

- **Application:** Next.js App Router, React, Clerk, MongoDB/Mongoose.
- **Scripts:** `npm test`, `npm run test:integration`, `npm run lint`, `npm run build`, `npm run dev`, `npm run dev:seeded`, `npm run seed:dev`.
- **Environment variable names:** `MONGODB_URI`, `MONGODB_DEV_URI`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `ADMIN_CLERK_USER_ID`, `CRON_SECRET`. No secret values are included here.
- **Models:** `User`, `Plan`, `Coupon`, `Subscription`, `Payment`, `AdminAudit`.
- **Routes:** Member dashboard, profile/account settings, plan listing/checkout, billing, subscription list/detail, admin dashboard and management pages, Clerk sign-in/sign-up, and `/api/cron/expire-subscriptions`.
- **API surface:** There is no general REST API for member/admin CRUD; operations use server-rendered pages, Server Actions, and the expiry API route. The cron route checks `CRON_SECRET`; authenticated pages/actions check Clerk identity and role server-side.
- **Latest validation:** 27 tests passed, lint passed, and the isolated production build passed after adding subscription history/details and Clerk account settings. The current dashboard also displays snapshot benefits.

## Feature status matrix

| Area | Source implementation | Verification status | Remaining gap |
|---|---|---|---|
| Clerk registration/login/logout | Clerk widgets, route protection, Clerk-to-Mongo upsert in `features/auth/server.js` | **PARTIAL** — sign-up/sign-in widgets rendered in browser; no authenticated account session confirmed | Create and verify separate test member; establish admin session in isolated app; check synchronization and sign-out persistence |
| Member profile | Name, phone, address edit; email and password managed in Clerk account settings | **PARTIAL** — validation and disposable MongoDB persistence tested; no authenticated browser edit | Browser verify update and re-login persistence |
| Member account email/password | New protected `/account` embeds Clerk `UserProfile` | **PARTIAL** — implementation added; build/browser check pending | Verify Clerk account update then Mongo email sync after authenticated page request |
| Member dashboard | Reads identity, subscription snapshot (including plan benefits), totals, recent payments, active plans | **PARTIAL** — queries covered indirectly by isolated DB tests; no authenticated dashboard browser verification | Validate live data with dedicated member |
| Active plan discovery | `/plans` reads active `Plan` documents; checkout includes server-derived current price | **PARTIAL** — browser showed three seeded plans; isolated data tests pass | No per-plan details route beyond checkout summary; validate signed-in selection journey |
| Coupon application | Checkout applies eligibility checks, expiry/active/limit/minimum rules; percent/flat pricing; claim is transactional | **PARTIAL** — isolated tests cover rule outcomes; no UI coupon browser test | Browser test valid and invalid coupons; publicly listing codes is intentionally not exposed |
| Checkout and payment | Server-calculates plan/coupon totals, transactionally creates subscription/payment, validates amount, has idempotency | **PARTIAL** — isolated MongoDB tests cover full/partial, stale quote, retries, and persistence | There is no payment gateway configured; demo adapter is clearly labelled and always records successful demo payment, not a real charge |
| Partial payment / balance | Atomic balance change, ownership checks, no overpayment; balance form available on billing page | **PARTIAL** — isolated transaction tests pass; no end-to-end browser payment | Browser verify initial payment and settlement |
| Payment history | Member-scoped billing filters, pagination, payment records and demo labels | **PARTIAL** — data filtering and ownership tested in isolated MongoDB; no browser verification | Add no separate downloadable receipt or gateway transaction detail beyond displayed payment record |
| Subscription list/details | Added `/subscriptions` and `/subscriptions/[subscriptionId]`; queries scope both subscription and payments to authenticated user | **PARTIAL** — ownership/integration test added; build and tests pending | No cancellation action: there is no defined refund/proration/cancellation policy in current requirements or source. Renewal is plan enrollment, not automatic renewal |
| Admin dashboard and tools | Existing live aggregates, member management/history, plans, coupons, subscriptions, transactions, audited changes; role checks on pages/actions | **PARTIAL** — query/actions and authorization policies tested; unauthenticated admin route redirects in browser | Existing configured admin account is available, but session was not established in isolated browser; test all authenticated UI operations |
| Expiry automation | Idempotent expiry service; bearer-protected cron API; daily schedule in `vercel.json` | **PARTIAL** — disposable MongoDB tests cover expired/upcoming/cancelled and 503/401/success | Configure deployment `CRON_SECRET`; verify deployed scheduled invocation |
| Notifications | Status, expiry notices, checkout/balance feedback rendered in existing UI | **PARTIAL** — UI notices exist; no persisted notification model or delivery system | No notification inbox/email/SMS service; failed-payment UI cannot be exercised by demo adapter |
| Security/data integrity | Clerk identity, admin role, member ownership, validation, transaction, unique indexes/idempotency | **PARTIAL** — isolated tests cover ownership, authorization policy, invalid pricing/amount, duplicate requests | No signed-in member-to-admin browser denial or cross-account browser test yet |

## Implementation changes in this audit

1. Added `getMemberSubscriptions` and `getMemberSubscriptionDetails`, both with member ownership filters.
2. Added a member subscription history route and subscription detail/payment-history route, including balance and renewal links.
3. Added authenticated Clerk account settings so the member can manage sign-in email/password without modifying the server-owned MongoDB role.
4. Added Memberships and Account Settings to the shared member navigation; the dashboard now displays plan benefits from its subscription snapshot.
5. Added isolated MongoDB tests proving subscription and payment detail reads are owner-scoped and malformed/non-owner IDs return no detail.

## Deliberate non-changes

- **No real payment gateway integration:** No configured gateway/package/credentials are present. The current documented demo adapter remains clearly marked; claiming an actual charge or adding an unconfigured gateway would be unsafe.
- **No cancellation action:** No business rule defines whether cancellation ends access immediately, applies a refund, prorates, or preserves balances. The existing model can represent `CANCELLED`, but no member cancellation policy/action is implemented.
- **No self-service role changes:** The profile and account settings do not allow editing the `role` field. Admin identity remains tied to the server-side configured Clerk user ID.
- **No public coupon directory:** Coupon codes and usage limits are administered by the admin UI; members apply a supplied code in checkout.
- **No persisted notification subsystem:** Current status, success, and expiry notices are contextual UI messaging; there is no notification model or outbound delivery integration.

## Required external verification

1. Use the existing development admin account at the isolated app and confirm `/admin/dashboard` actually loads; keep its credentials private and do not alter its configuration.
2. Create and verify a distinct test member via Clerk development `/sign-up` using an email the user controls.
3. Perform profile/account, plan/coupon, demo-payment, history, dashboard, and admin UI workflows against `fitness_subscription_dev`; verify records after each meaningful write.
4. Configure test/deployment `CRON_SECRET` and verify the deployed scheduled job.
5. Do not mark the application end-to-end complete until those authenticated browser flows have actual evidence.
