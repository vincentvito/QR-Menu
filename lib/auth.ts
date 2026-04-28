import { cache } from 'react'
import { headers } from 'next/headers'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, emailOTP, organization } from 'better-auth/plugins'
import { stripe as stripePlugin } from '@better-auth/stripe'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { otpEmailTemplate, inviteEmailTemplate } from '@/lib/email-templates'
import { CREDIT_PACK, PLANS } from '@/lib/plans'
import { grantBonusCredits, resetMonthlyCredits } from '@/lib/plans/credits'
import { reconcileRestaurantActivation } from '@/lib/plans/reconcile'

// Emails that should be promoted to the platform admin role on signup.
// Promotion happens via the user-create hook below.
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Stripe plugin is only registered when STRIPE_SECRET_KEY is set — keeps
// local dev working for contributors who haven't done Stripe setup yet.
// Price IDs below are env-driven so the same code ships to prod without
// hardcoded references; populate STRIPE_PRICE_* vars once you create the
// prices in your Stripe dashboard.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-03-25.dahlia' })
  : null

const STRIPE_PLANS = [
  {
    name: 'basic',
    priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? '',
    annualDiscountPriceId: process.env.STRIPE_PRICE_BASIC_YEARLY ?? '',
    limits: {
      restaurants: PLANS.basic.maxRestaurants,
      menusPerRestaurant: PLANS.basic.maxMenusPerRestaurant,
      monthlyCredits: PLANS.basic.monthlyCredits,
    },
    freeTrial: {
      days: 14,
      onTrialStart: async (subscription: { referenceId: string }) => {
        await grantBonusCredits(subscription.referenceId, PLANS.trial.trialCredits ?? 5, {
          type: 'grant',
          reason: 'trial-start',
        })
      },
    },
  },
  {
    name: 'pro',
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    annualDiscountPriceId: process.env.STRIPE_PRICE_PRO_YEARLY ?? '',
    limits: {
      restaurants: PLANS.pro.maxRestaurants,
      menusPerRestaurant: PLANS.pro.maxMenusPerRestaurant,
      monthlyCredits: PLANS.pro.monthlyCredits,
    },
    freeTrial: {
      days: 14,
      onTrialStart: async (subscription: { referenceId: string }) => {
        await grantBonusCredits(subscription.referenceId, PLANS.trial.trialCredits ?? 5, {
          type: 'grant',
          reason: 'trial-start',
        })
      },
    },
  },
  {
    name: 'business',
    priceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
    annualDiscountPriceId: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? '',
    limits: {
      restaurants: PLANS.business.maxRestaurants,
      menusPerRestaurant: PLANS.business.maxMenusPerRestaurant,
      monthlyCredits: PLANS.business.monthlyCredits,
    },
    freeTrial: {
      days: 14,
      onTrialStart: async (subscription: { referenceId: string }) => {
        await grantBonusCredits(subscription.referenceId, PLANS.trial.trialCredits ?? 5, {
          type: 'grant',
          reason: 'trial-start',
        })
      },
    },
  },
  {
    name: 'enterprise',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
    limits: {
      restaurants: PLANS.enterprise.maxRestaurants,
      menusPerRestaurant: PLANS.enterprise.maxMenusPerRestaurant,
      monthlyCredits: PLANS.enterprise.monthlyCredits,
    },
  },
]

// Decide whether a subscription lifecycle event is a renewal (the billing
// period rolled over) by comparing the new periodStart with what we last
// cached on the denormalized Organization columns.
async function isRenewalEvent(organizationId: string, newPeriodStart: Date | null | undefined) {
  if (!newPeriodStart) return false
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { monthlyCreditsResetAt: true },
  })
  if (!org?.monthlyCreditsResetAt) return true
  return newPeriodStart.getTime() > org.monthlyCreditsResetAt.getTime()
}

// Shared lifecycle handler used by both `onSubscriptionCreated` and
// `onSubscriptionUpdate` — Better Auth fires those for separate Stripe events
// (`customer.subscription.created` vs `.updated`), and both can mark the start
// of a fresh billing period that needs the monthly credit bucket reset.
//
// Skips trialing subs intentionally: trial users get the one-time bonus from
// `onTrialStart` only. The plan's monthly allowance lands when the trial
// converts to active (which fires an `.updated` event with `status === 'active'`).
async function handleSubscriptionLifecycle(subscription: {
  referenceId: string
  plan: string
  status: string
  periodStart?: Date | null
}) {
  // TEMP debug — remove after the full clean-room test confirms the flow.
  console.log('[handleSubscriptionLifecycle] entered', {
    referenceId: subscription.referenceId,
    plan: subscription.plan,
    status: subscription.status,
    periodStart: subscription.periodStart,
  })
  if (subscription.status === 'active') {
    const isRenewal = await isRenewalEvent(subscription.referenceId, subscription.periodStart)
    console.log('[handleSubscriptionLifecycle] active branch', {
      isRenewal,
      planLookup: PLANS[subscription.plan as keyof typeof PLANS]?.id ?? 'NOT FOUND',
      monthlyCredits: PLANS[subscription.plan as keyof typeof PLANS]?.monthlyCredits,
    })
    if (isRenewal) {
      const planDef = PLANS[subscription.plan as keyof typeof PLANS]
      const amount = planDef?.monthlyCredits ?? 0
      if (amount > 0 && subscription.periodStart) {
        console.log('[handleSubscriptionLifecycle] granting', { amount })
        await resetMonthlyCredits(subscription.referenceId, amount, subscription.periodStart)
      } else {
        console.log('[handleSubscriptionLifecycle] skipped grant', {
          amount,
          hasPeriodStart: !!subscription.periodStart,
        })
      }
    }
  } else {
    console.log('[handleSubscriptionLifecycle] non-active status, skipping grant')
  }
  // Any plan change may shift the restaurant cap — reconcile readOnly flags
  // against the current cap regardless of period state.
  await reconcileRestaurantActivation(subscription.referenceId)
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false,
  },
  advanced: {
    // Force secure cookies only in production
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  // Declare the custom `activeRestaurantId` column on the session row so
  // better-auth's Prisma adapter includes it in its SELECT and
  // `auth.api.getSession()` surfaces it. Without this, the column is read
  // from DB as part of *writes* (the set-active route updates it), but
  // stripped on every session read — so the dashboard never saw the switch.
  session: {
    additionalFields: {
      activeRestaurantId: { type: 'string', required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-elevate known platform owners to admin on signup. Keeps the
          // first-deploy experience frictionless — just sign up with your
          // email and you land with admin privileges.
          if (PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return { data: { ...user, role: 'admin' } }
          }
          return { data: user }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        const { subject, html } = otpEmailTemplate({ otp, type })
        await sendEmail({ to: email, subject, html })
      },
    }),
    organization({
      creatorRole: 'owner',
      // Restaurant-specific fields (branding, QR, wifi, socials, template)
      // used to live here as `additionalFields`. Phase 5 moved them all onto
      // the Restaurant model, so the plugin is back to its default schema.
      sendInvitationEmail: async ({ email, invitation, organization, inviter }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
        const acceptUrl = `${baseUrl}/accept-invite?invitationId=${invitation.id}`
        const inviterName = inviter.user.name?.trim() || inviter.user.email || 'A teammate'
        const { subject, html } = inviteEmailTemplate({
          inviterName,
          restaurantName: organization.name,
          acceptUrl,
        })
        await sendEmail({ to: email, subject, html })
      },
    }),
    admin(),
    ...(stripeClient && stripeWebhookSecret
      ? [
          stripePlugin({
            stripeClient,
            stripeWebhookSecret,
            createCustomerOnSignUp: true,
            subscription: {
              enabled: true,
              plans: STRIPE_PLANS,
              // Only owners/admins can change the org's plan. Other roles can
              // view billing state but not modify it.
              authorizeReference: async ({ user, referenceId, action }) => {
                if (action === 'upgrade-subscription' || action === 'cancel-subscription') {
                  const member = await prisma.member.findFirst({
                    where: { userId: user.id, organizationId: referenceId },
                    select: { role: true },
                  })
                  return member ? ['owner', 'admin'].includes(member.role) : false
                }
                return true
              },
              // Fires when a user finishes Stripe Checkout (the typical
              // subscribe path). This is the hook that actually runs for
              // Checkout-initiated subs — `onSubscriptionCreated` is only
              // invoked for dashboard-created subs that don't exist in our DB
              // yet, which means it's effectively unreachable in our app.
              onSubscriptionComplete: async ({
                subscription,
              }: {
                subscription: {
                  referenceId: string
                  plan: string
                  status: string
                  periodStart?: Date | null
                }
              }) => {
                console.log('[onSubscriptionComplete] fired')
                await handleSubscriptionLifecycle(subscription)
              },
              // Belt-and-braces: fires when a Stripe subscription is created
              // outside the Checkout flow (e.g. directly via Dashboard) and
              // wasn't pre-staged in our DB. Rare, but harmless to handle.
              onSubscriptionCreated: async ({
                subscription,
              }: {
                subscription: {
                  referenceId: string
                  plan: string
                  status: string
                  periodStart?: Date | null
                }
              }) => {
                console.log('[onSubscriptionCreated] fired')
                await handleSubscriptionLifecycle(subscription)
              },
              // Fired by Better Auth on `customer.subscription.updated`. Covers
              // trial→active conversion, plan changes, and monthly renewals —
              // all of which may roll the billing period and need the monthly
              // bucket refilled.
              onSubscriptionUpdate: async ({
                subscription,
              }: {
                subscription: {
                  referenceId: string
                  plan: string
                  status: string
                  periodStart?: Date | null
                }
              }) => {
                await handleSubscriptionLifecycle(subscription)
              },
            },
            organization: { enabled: true },
            // Catch one-time `mode: 'payment'` Checkout completions for credit
            // packs. The plugin itself only knows how to process subscription
            // checkouts; this hook runs after its default handler for every
            // event.
            onEvent: async (event) => {
              if (event.type !== 'checkout.session.completed') return
              const session = event.data.object as Stripe.Checkout.Session
              if (session.mode !== 'payment') return
              if (session.metadata?.kind !== 'credit-pack-100') return
              if (session.payment_status !== 'paid') return

              const organizationId = session.metadata?.organizationId
              if (!organizationId) return

              // Idempotency: Stripe retries webhooks. Skip if we've already
              // credited this session.
              const already = await prisma.creditTransaction.findFirst({
                where: {
                  organizationId,
                  type: 'purchase',
                  reason: 'credit-pack-100',
                  metadata: { path: ['sessionId'], equals: session.id },
                },
                select: { id: true },
              })
              if (already) return

              await grantBonusCredits(organizationId, CREDIT_PACK.credits, {
                type: 'purchase',
                reason: 'credit-pack-100',
                metadata: {
                  sessionId: session.id,
                  amountTotal: session.amount_total ?? null,
                  currency: session.currency ?? null,
                },
              })
            },
          }),
        ]
      : []),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
})

// Per-request session cache. RSC layouts can't pass props to child pages,
// so the same session is otherwise fetched twice (once in the layout, once
// in the page). React.cache dedupes within a single request.
export const getCachedSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})
