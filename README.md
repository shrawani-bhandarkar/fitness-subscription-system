This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication setup

Authentication uses Clerk. Copy `.env.example` to `.env.local` and configure
the Clerk publishable and secret keys, `MONGODB_URI`, and
`ADMIN_CLERK_USER_ID`. Configure `CLERK_WEBHOOK_SECRET` for Clerk user
synchronization. Keep `.env.local` private; it is ignored by Git.
For local development sample plans and coupons, set `MONGODB_DEV_URI` to a
separate Atlas database named `fitness_subscription_dev`; do not point it at
the application or production database.

The Clerk sign-in and sign-up pages are available at `/sign-in` and `/sign-up`.
Self-service signup is enabled through Clerk; each newly registered account is
created in MongoDB with the `MEMBER` role. Configure a Clerk webhook at
`/api/webhooks/clerk` for `user.created`, `user.updated`, and `user.deleted`,
and store its signing secret in `CLERK_WEBHOOK_SECRET`. Signed events keep
MongoDB profile data synchronized; the webhook verifies Clerk signatures and
returns a retryable error if synchronization fails. Authenticated application
requests also idempotently synchronize the current Clerk profile if a webhook
is delayed or unavailable. The Clerk user ID has a unique MongoDB index, so
retries cannot create duplicate user records.

Unauthenticated requests to `/dashboard`, `/billing`, and `/admin/*` are
redirected to sign-in. Authentication and administrator checks are also
available as server-only helpers in `features/auth/server.js`; call the
appropriate helper inside every future Server Action or API/route handler that
reads or changes protected data.

To preserve or grant administrator access, set `ADMIN_CLERK_USER_ID` to the
existing administrator's Clerk user ID in the server environment. Only that
exact server-configured ID receives the `ADMIN` role; Clerk metadata or signup
form input cannot assign it. New member accounts use the `MEMBER` role. Do not
put the administrator ID in a `NEXT_PUBLIC_*` variable. After sign-in or
registration, the app synchronizes the MongoDB profile and redirects the
configured administrator to `/admin/dashboard` and members to `/dashboard`.
Existing MongoDB records with the legacy `USER` member role remain supported.

For Vercel, configure the same environment variables in the project's server
environment settings. Configure `CRON_SECRET` as a private random secret so
the scheduled subscription expiry job can update expired records. The
`vercel.json` schedule invokes `/api/cron/expire-subscriptions` daily; the
endpoint rejects requests unless they include the matching bearer token.
Never commit real environment values.

## Membership, billing, and administration

Members can view active plans at `/plans` and begin enrollment from a plan's
checkout. Member checkout accepts active, unexpired coupons that meet their
usage and minimum-purchase requirements. The server applies plan discounts
first, then caps the coupon discount against the discounted plan total; applying
or removing a code does not consume coupon usage. Checkout recalculates the
current plan and coupon from MongoDB, stores plan/coupon snapshots on the
subscription and initial payment, and writes the subscription, payment, and
coupon usage update together in a MongoDB transaction. Later balance payments
use the saved discounted total and do not reapply the coupon. Partial payments
are available only for plans that allow them. All monetary values in storage
are integer INR paise (100 paise = INR 1).

Payments are simulated for MVP development only. A successful demo submission
creates a payment marked successful with a `DEMO-` reference; it does not
charge money and is not connected to a payment gateway. Do not treat demo
records as real collections. MongoDB Atlas (replica set) is required for the
atomic transaction workflow.

Admin sections are available from `/admin/dashboard`: `/admin/plans`,
`/admin/coupons`, `/admin/subscriptions`, `/admin/transactions`, and
`/admin/members`. Each page and each server action enforces the existing
server-side admin role check. A plan with historical subscriptions is
deactivated and audited instead of removed, preserving subscription references;
plans without subscriptions can be deleted. Used coupons cannot be deleted.
An admin can waive an eligible partial
subscription balance only with a reason; the change is audit logged and does
not create a payment or represent money received.

Subscription expiry is persisted by the authenticated daily server-side job.
Member and admin status views also calculate expiry from the end date, so
displayed status remains current if a scheduled run is delayed.

The member dashboard and billing views query only the authenticated member's
MongoDB profile and records. No sample plans, subscriptions, dashboard
statistics, or transactions are generated automatically.
Members can view and update their name, phone number, and address at `/profile`;
sign-in email and password are managed through the authenticated Clerk account
settings at `/account`. Members can review subscription history and
subscription-scoped payment records at `/subscriptions`. Administrators can open a member from
`/admin/members` to inspect subscription/payment history and save audited name,
phone, or address changes. Email and role are not editable from member
management.

### Optional development seed

The seed command only writes to the `fitness_subscription_dev` database and
requires `FSS_ALLOW_DEV_SEED=true`. It uses `MONGODB_DEV_URI` when configured;
otherwise it derives the dedicated database path from `MONGODB_URI` without
changing `.env.local` or the application's normal database setting.
It creates three active plans and one percentage plus one flat coupon. Existing
records with the seed names/codes are skipped, never updated. If you prefer a
separate Atlas user/cluster, configure `MONGODB_DEV_URI` in your ignored
`.env.local`; otherwise the existing connection is redirected to this separate
database name. Run:

```powershell
$env:FSS_ALLOW_DEV_SEED = "true"
npm run seed:dev
Remove-Item Env:FSS_ALLOW_DEV_SEED
```

For local browsing against the seeded database without changing the app's
normal `MONGODB_URI`, stop any existing Next.js dev server and start with:

```powershell
npm run dev:seeded
```

This command routes only its child Next.js process to the dedicated development
database and refuses any URI whose database name is not
`fitness_subscription_dev`.

The automated integration suite uses a new, uniquely named `fss_it_*` database,
verifies persistence and billing behavior,
then drops only that temporary test database. Run `npm test` for unit and
integration tests. MongoDB Atlas must allow transactions for the billing
integration tests.
