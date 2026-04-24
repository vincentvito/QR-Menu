import prisma from '@/lib/prisma'
import { resolvePlan, type PlanDefinition } from '@/lib/plans'

const ACTIVE_STATUSES = ['trialing', 'active', 'past_due']

export interface TrialState {
  trialEnd: Date
  planName: string
}

// Thin fetch used by the global TrialBanner. Returns null when the org
// isn't trialing, so the layout can avoid rendering anything in the
// common case. Intentionally much lighter than `getBillingState`, which
// also pulls org overrides + restaurants — neither needed for the
// banner.
export async function getTrialState(organizationId: string): Promise<TrialState | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { referenceId: organizationId, status: 'trialing' },
    orderBy: { createdAt: 'desc' },
    select: { plan: true, trialEnd: true },
  })
  if (!subscription?.trialEnd) return null
  return { trialEnd: subscription.trialEnd, planName: subscription.plan }
}

export interface BillingState {
  plan: PlanDefinition
  subscription: {
    id: string
    plan: string
    status: string
    billingInterval: string | null
    periodEnd: Date | null
    trialEnd: Date | null
    cancelAtPeriodEnd: boolean
  } | null
  credits: {
    monthly: number
    bonus: number
    total: number
    resetsAt: Date | null
  }
  usage: {
    restaurantCount: number
  }
  overrides: {
    maxRestaurantsOverride: number | null
    monthlyCreditsOverride: number | null
  }
  restaurants: Array<{
    id: string
    name: string
    slug: string
    readOnly: boolean
  }>
}

// One-shot fetch of everything the billing UI needs for an org. Keeps the
// page component to a single await and hides the `ACTIVE_STATUSES` detail
// from the UI layer.
export async function getBillingState(organizationId: string): Promise<BillingState> {
  const [subscription, org, restaurants] = await Promise.all([
    prisma.subscription.findFirst({
      where: { referenceId: organizationId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        status: true,
        billingInterval: true,
        periodEnd: true,
        trialEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        monthlyCreditsRemaining: true,
        bonusCreditsRemaining: true,
        monthlyCreditsResetAt: true,
        maxRestaurantsOverride: true,
        monthlyCreditsOverride: true,
      },
    }),
    prisma.restaurant.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, slug: true, readOnly: true },
    }),
  ])

  const plan = resolvePlan(subscription, org)
  return {
    plan,
    subscription,
    credits: {
      monthly: org?.monthlyCreditsRemaining ?? 0,
      bonus: org?.bonusCreditsRemaining ?? 0,
      total: (org?.monthlyCreditsRemaining ?? 0) + (org?.bonusCreditsRemaining ?? 0),
      resetsAt: org?.monthlyCreditsResetAt ?? null,
    },
    usage: { restaurantCount: restaurants.length },
    overrides: {
      maxRestaurantsOverride: org?.maxRestaurantsOverride ?? null,
      monthlyCreditsOverride: org?.monthlyCreditsOverride ?? null,
    },
    restaurants,
  }
}
