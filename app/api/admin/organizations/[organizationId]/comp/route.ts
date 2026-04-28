import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlanId, resolvePlan, type PlanId } from '@/lib/plans'
import { resetMonthlyCredits } from '@/lib/plans/credits'
import { reconcileRestaurantActivation } from '@/lib/plans/reconcile'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

const COMP_PLAN_IDS: PlanId[] = ['basic', 'pro', 'business', 'enterprise']
const MAX_REASON = 80

function cleanReason(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, MAX_REASON)
  return trimmed || null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { organizationId } = await params
  let body: { compPlan?: unknown; compReason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const nextPlanRaw = body.compPlan === null || body.compPlan === '' ? null : body.compPlan
  let nextPlan: PlanId | null = null
  if (nextPlanRaw !== null) {
    if (!isPlanId(nextPlanRaw) || !COMP_PLAN_IDS.includes(nextPlanRaw)) {
      return NextResponse.json({ error: 'Unsupported comp plan' }, { status: 400 })
    }
    nextPlan = nextPlanRaw
  }

  const existing = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { compPlan: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data:
      nextPlan === null
        ? {
            compPlan: null,
            compReason: null,
            compGrantedBy: null,
            compGrantedAt: null,
          }
        : {
            compPlan: nextPlan,
            compReason: cleanReason(body.compReason),
            compGrantedBy: session.user.id,
            compGrantedAt: new Date(),
          },
    select: {
      id: true,
      compPlan: true,
      compReason: true,
      compGrantedAt: true,
      maxRestaurantsOverride: true,
      monthlyCreditsOverride: true,
    },
  })

  if (updated.compPlan && existing.compPlan !== updated.compPlan) {
    const plan = resolvePlan(null, updated)
    const amount = plan.monthlyCredits ?? 0
    if (amount > 0) {
      await resetMonthlyCredits(updated.id, amount, new Date())
    }
  } else if (!updated.compPlan && existing.compPlan) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        referenceId: updated.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    })
    const plan = resolvePlan(subscription, updated)
    const amount = subscription ? (plan.monthlyCredits ?? 0) : 0
    if (amount > 0) {
      await resetMonthlyCredits(updated.id, amount, new Date())
    } else {
      await prisma.organization.update({
        where: { id: updated.id },
        data: {
          monthlyCreditsRemaining: 0,
          monthlyCreditsResetAt: null,
        },
      })
    }
  }

  await reconcileRestaurantActivation(updated.id)
  after(() => {
    revalidatePath('/admin/users')
    revalidatePath('/admin')
    revalidatePath('/dashboard', 'layout')
  })

  return NextResponse.json({
    ok: true,
    compPlan: updated.compPlan,
    compReason: updated.compReason,
    compGrantedAt: updated.compGrantedAt,
  })
}
