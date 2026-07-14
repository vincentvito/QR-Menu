# Qtable

Qtable turns printed restaurant menus into mobile-friendly public menus and QR codes. Restaurant owners can import a menu from a PDF/photo/text, edit dishes and categories, publish a branded public menu, generate dish photos with AI credits, manage restaurant settings, invite staff, and track public-menu activity.

## Stack

- Next.js 16 App Router with React 19 and TypeScript
- Tailwind CSS 4 and shadcn/ui primitives
- Prisma 7 with PostgreSQL
- Better Auth for OTP sign-in, organizations, admin, and Stripe integration
- Stripe subscriptions, trials, webhooks, and one-time AI credit packs
- next-intl for English, Spanish, and Italian localization
- Google Gemini for menu extraction and dish image generation
- Cloudflare R2 for uploaded logos, headers, and dish photos
- ZeptoMail for OTP and invitation email delivery
- FeedbackBasket for in-app feedback collection

## Core Flows

- Onboarding creates a restaurant and lets owners build in setup mode before starting a trial.
- Starting a trial goes through Stripe, captures payment details, unlocks public publishing, and grants 5 bonus AI credits.
- Plan limits control restaurant count, read-only states, and monthly AI credits.
- Public menus stay private until an active trial, paid subscription, or complimentary plan is present.
- Menu imports can detect categories, item descriptions, dietary tags, and size-based prices.
- Customer-facing menu templates support editorial, photo grid, and category tiles layouts.

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the dev server:

```bash
npm run dev
```

The local app runs on [http://localhost:3001](http://localhost:3001).

## Environment

See `.env.example` for the full list. Production deploys must set at least:

- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the production domain.
- `BETTER_AUTH_SECRET` to a random value of at least 32 characters.
- `DATABASE_URL` for runtime database access and `DIRECT_URL` for migrations.
- Stripe keys, webhook secret, plan price IDs, and credit-pack price ID.
- `GOOGLE_GENERATIVE_AI_API_KEY` for menu extraction and AI photo generation.
- Cloudflare R2 credentials and public asset URL.
- ZeptoMail credentials and sender identity.
- `PLATFORM_ADMIN_EMAILS` for owner/admin bootstrap accounts.

Do not deploy with localhost URLs in production. They affect auth redirects, invitation links, public QR URLs, and checkout return URLs.

## Database

Runtime Prisma uses `DATABASE_URL`. In hosted Supabase-style setups, use the pooled connection string for runtime and `DIRECT_URL` for migrations.

Development:

```bash
npx prisma migrate dev
```

Production:

```bash
npx prisma migrate deploy
```

The current schema includes `MenuItem.variants` for multi-price dishes such as pizza sizes. Make sure all migrations are applied before launching menu imports or public menus.

## Billing And Credits

Stripe powers trials, subscriptions, plan changes, and credit packs. Required launch checks:

- Stripe webhook points at the deployed Better Auth endpoint.
- Trial start grants the one-time 5-credit bonus.
- Trial-to-active conversion grants the monthly plan credits.
- Monthly renewal resets the monthly credit bucket.
- Credit-pack checkout grants 100 bonus credits once, idempotently.
- Owners/admins can manage billing; staff cannot.

## Useful Scripts

```bash
npm run dev            # Start local dev server on port 3001
npm run build          # Production build
npm run lint           # ESLint
npm run format:check   # Prettier check
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run local migrations
```

Account cleanup for clean-room testing:

```bash
npx tsx scripts/delete-account.ts user@example.com
npx tsx scripts/delete-account.ts user@example.com --confirm
```

## Launch Checklist

- Run `npm run lint`, `npm run format:check`, and `npm run build`.
- Run `npx prisma migrate deploy` against production.
- Verify signup, OTP email, onboarding, setup mode, trial checkout, and Stripe webhook delivery.
- Verify AI menu import, AI photo generation, out-of-credits states, and credit-pack checkout.
- Verify public QR URLs use the production domain.
- Scan a real QR code on a phone and test each public menu template.
- Confirm Cloudflare R2 assets load publicly.
- Confirm database backups and Stripe live/test mode are intentional.
