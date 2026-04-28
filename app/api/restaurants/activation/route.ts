import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { resolvePlan } from '@/lib/plans'
import { ACTIVE_SUBSCRIPTION_STATUSES, canWriteDashboard } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

// Sets which of the user's restaurants are active under their current plan.
// The rest become readOnly: their public menus keep serving but the dashboard
// won't let them be edited until the user either picks them again (after
// freeing a slot) or upgrades the plan.
export async function POST(request: Request) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) {
    return NextResponse.json({ error: 'No active organization' }, { status: 409 })
  }

  const member = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(org.id)
  if (!writeGate.allowed) {
    return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
  }

  let body: { activeIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.activeIds) || !body.activeIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'activeIds must be a string[]' }, { status: 400 })
  }
  const activeIds = Array.from(new Set(body.activeIds as string[]))

  // Load plan cap and the org's restaurants to validate the pick.
  const [subscription, orgOverrides, restaurants] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        referenceId: org.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    }),
    prisma.organization.findUnique({
      where: { id: org.id },
      select: {
        maxRestaurantsOverride: true,
        monthlyCreditsOverride: true,
        compPlan: true,
      },
    }),
    prisma.restaurant.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    }),
  ])
  const plan = resolvePlan(subscription, orgOverrides)
  const cap = plan.maxRestaurants

  const orgRestaurantIds = new Set(restaurants.map((r) => r.id))
  if (!activeIds.every((id) => orgRestaurantIds.has(id))) {
    return NextResponse.json({ error: 'Unknown restaurant in activeIds' }, { status: 400 })
  }
  if (cap !== null && activeIds.length > cap) {
    return NextResponse.json(
      {
        error: `Your ${plan.name} plan only allows ${cap} active restaurant${cap === 1 ? '' : 's'}.`,
      },
      { status: 409 },
    )
  }

  const toActivate = activeIds
  const toFreeze = [...orgRestaurantIds].filter((id) => !activeIds.includes(id))

  await prisma.$transaction([
    prisma.restaurant.updateMany({
      where: { id: { in: toActivate } },
      data: { readOnly: false },
    }),
    prisma.restaurant.updateMany({
      where: { id: { in: toFreeze } },
      data: { readOnly: true },
    }),
  ])

  revalidatePath('/dashboard', 'layout')
  return NextResponse.json({ ok: true })
}
