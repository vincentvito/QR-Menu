import prisma from '@/lib/prisma'
import { resolvePlan } from '@/lib/plans'
import { ensureCompMonthlyCredits } from '@/lib/plans/credits'
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_LAPSED_MESSAGE,
  canWriteDashboard,
} from '@/lib/plans/subscription-access'

export interface GateResult {
  allowed: boolean
  reason?: string
  currentCount: number
  limit: number | null
}

// Statuses that mean "has a live subscription right now" — trialing and
// past_due both still have access; canceled/incomplete do not. The plugin
// creates new subscription rows on resubscribe so we pick the most recent
// active-ish one rather than rely on uniqueness.
async function loadPlanContext(organizationId: string) {
  const [subscription, org] = await Promise.all([
    prisma.subscription.findFirst({
      where: { referenceId: organizationId, status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { maxRestaurantsOverride: true, monthlyCreditsOverride: true, compPlan: true },
    }),
  ])
  return { subscription, plan: resolvePlan(subscription, org) }
}

export async function canCreateRestaurant(organizationId: string): Promise<GateResult> {
  const [writeGate, { plan }, currentCount] = await Promise.all([
    canWriteDashboard(organizationId),
    loadPlanContext(organizationId),
    prisma.restaurant.count({ where: { organizationId } }),
  ])
  if (!writeGate.allowed) {
    return {
      allowed: false,
      reason: writeGate.reason ?? SUBSCRIPTION_LAPSED_MESSAGE,
      currentCount,
      limit: 0,
    }
  }
  const limit = plan.maxRestaurants
  const allowed = limit === null || currentCount < limit
  return {
    allowed,
    reason: allowed
      ? undefined
      : `Your ${plan.name} plan allows up to ${limit} restaurant${limit === 1 ? '' : 's'}. Upgrade to add more.`,
    currentCount,
    limit,
  }
}

export async function canCreateMenu(restaurantId: string): Promise<GateResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      organizationId: true,
      readOnly: true,
      _count: { select: { menus: true } },
    },
  })
  if (!restaurant) {
    return { allowed: false, reason: 'Restaurant not found', currentCount: 0, limit: null }
  }
  if (restaurant.readOnly) {
    return {
      allowed: false,
      reason:
        'This restaurant is read-only because your plan doesn’t cover it. Activate it from Billing or upgrade your plan.',
      currentCount: restaurant._count.menus,
      limit: 0,
    }
  }
  const [writeGate, { plan }] = await Promise.all([
    canWriteDashboard(restaurant.organizationId),
    loadPlanContext(restaurant.organizationId),
  ])
  if (!writeGate.allowed) {
    return {
      allowed: false,
      reason: writeGate.reason ?? SUBSCRIPTION_LAPSED_MESSAGE,
      currentCount: restaurant._count.menus,
      limit: 0,
    }
  }
  const limit = plan.maxMenusPerRestaurant
  const currentCount = restaurant._count.menus
  const allowed = currentCount < limit
  return {
    allowed,
    reason: allowed ? undefined : `Each restaurant supports up to ${limit} menus on your plan.`,
    currentCount,
    limit,
  }
}

export interface CreditsAvailable {
  monthly: number
  bonus: number
  total: number
}

export async function getAvailableCredits(organizationId: string): Promise<CreditsAvailable> {
  const refreshed = await ensureCompMonthlyCredits(organizationId)
  if (refreshed) {
    return {
      monthly: refreshed.monthly,
      bonus: refreshed.bonus,
      total: refreshed.total,
    }
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { monthlyCreditsRemaining: true, bonusCreditsRemaining: true },
  })
  if (!org) return { monthly: 0, bonus: 0, total: 0 }
  return {
    monthly: org.monthlyCreditsRemaining,
    bonus: org.bonusCreditsRemaining,
    total: org.monthlyCreditsRemaining + org.bonusCreditsRemaining,
  }
}

export async function hasCredits(organizationId: string, amount: number): Promise<boolean> {
  const { total } = await getAvailableCredits(organizationId)
  return total >= amount
}
