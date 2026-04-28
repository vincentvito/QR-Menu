import { cache } from 'react'
import prisma from '@/lib/prisma'

export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due'] as const

const SUBSCRIPTION_HISTORY_REASONS = ['trial-start', 'monthly-reset']
const SUBSCRIPTION_HISTORY_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]

export interface SubscriptionAccessState {
  hasActiveSubscription: boolean
  hasSubscriptionHistory: boolean
  isComped: boolean
  isLapsed: boolean
  latestSubscription: {
    id: string
    plan: string
    status: string
    periodEnd: Date | null
    trialEnd: Date | null
    canceledAt: Date | null
    endedAt: Date | null
  } | null
}

export const SUBSCRIPTION_LAPSED_MESSAGE =
  'Your subscription has ended. Public menus stay live, but dashboard editing is paused until you pick a plan.'

export const getSubscriptionAccessState = cache(async function getSubscriptionAccessState(
  organizationId: string,
): Promise<SubscriptionAccessState> {
  const [organization, latestSubscription, subscriptionHistory, creditHistory] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { compPlan: true },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organizationId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        plan: true,
        status: true,
        periodEnd: true,
        trialEnd: true,
        canceledAt: true,
        endedAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: {
        referenceId: organizationId,
        status: { in: SUBSCRIPTION_HISTORY_STATUSES },
      },
      select: { id: true },
    }),
    prisma.creditTransaction.findFirst({
      where: {
        organizationId,
        reason: { in: SUBSCRIPTION_HISTORY_REASONS },
      },
      select: { id: true },
    }),
  ])

  const isComped = Boolean(organization?.compPlan)
  const hasActiveSubscription = latestSubscription
    ? ACTIVE_SUBSCRIPTION_STATUSES.includes(
        latestSubscription.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
      )
    : false
  const hasSubscriptionHistory = Boolean(subscriptionHistory || creditHistory)

  return {
    hasActiveSubscription: isComped || hasActiveSubscription,
    hasSubscriptionHistory,
    isComped,
    isLapsed: hasSubscriptionHistory && !hasActiveSubscription && !isComped,
    latestSubscription,
  }
})

export async function canWriteDashboard(organizationId: string): Promise<{
  allowed: boolean
  reason?: string
  gate?: 'subscription-lapsed'
}> {
  const access = await getSubscriptionAccessState(organizationId)
  if (!access.isLapsed) return { allowed: true }
  return {
    allowed: false,
    reason: SUBSCRIPTION_LAPSED_MESSAGE,
    gate: 'subscription-lapsed',
  }
}

export async function canWriteRestaurant(
  organizationId: string,
  restaurantId: string | null,
): Promise<{
  allowed: boolean
  reason?: string
  gate?: 'subscription-lapsed' | 'restaurant-read-only'
}> {
  const dashboardGate = await canWriteDashboard(organizationId)
  if (!dashboardGate.allowed) return dashboardGate
  if (!restaurantId) return { allowed: true }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { readOnly: true },
  })
  if (!restaurant?.readOnly) return { allowed: true }
  return {
    allowed: false,
    reason:
      'This restaurant is read-only under your current plan. Activate it from Billing or upgrade your plan.',
    gate: 'restaurant-read-only',
  }
}
