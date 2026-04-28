import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { makeSlug } from '@/lib/menus/slug'
import { isSupportedCurrency, DEFAULT_CURRENCY } from '@/lib/menus/currency'
import { resolvePlan } from '@/lib/plans'
import { canWriteDashboard } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

const MAX_NAME = 120
const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due']

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, MAX_NAME)
  return trimmed || null
}

// Adds a new restaurant to the caller's active organization. Enforces
// the plan's `maxRestaurants` cap — at-cap returns 409 with a clear
// upgrade message rather than silently creating a readOnly row (that
// behavior is already handled by the downgrade path in
// reconcileRestaurantActivation; creation-time is a different moment
// and the user needs the error up front).
//
// On success: creates the Restaurant row, flips the session's
// activeRestaurantId to the new id, and returns the slug so the client
// can navigate.
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

  // Membership + plan/cap fan-out in parallel. Each is independent and
  // we need all three before we can decide whether to create.
  const [membership, subscription, orgOverrides, currentCount] = await Promise.all([
    prisma.member.findFirst({
      where: { organizationId: org.id, userId: session.user.id },
      select: { role: true },
    }),
    prisma.subscription.findFirst({
      where: {
        referenceId: org.id,
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    }),
    prisma.organization.findUnique({
      where: { id: org.id },
      select: { maxRestaurantsOverride: true, monthlyCreditsOverride: true },
    }),
    prisma.restaurant.count({ where: { organizationId: org.id } }),
  ])

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(org.id)
  if (!writeGate.allowed) {
    return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
  }

  const plan = resolvePlan(subscription, orgOverrides)
  if (plan.maxRestaurants !== null && currentCount >= plan.maxRestaurants) {
    return NextResponse.json(
      {
        error: `Your ${plan.name} plan allows ${plan.maxRestaurants} restaurant${
          plan.maxRestaurants === 1 ? '' : 's'
        }. Upgrade or free a slot to add another.`,
        gate: 'plan-cap',
      },
      { status: 409 },
    )
  }

  let body: { name?: unknown; currency?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = cleanName(body.name)
  if (!name) {
    return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 })
  }

  const currencyRaw =
    typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : DEFAULT_CURRENCY
  const currency = isSupportedCurrency(currencyRaw) ? currencyRaw : DEFAULT_CURRENCY

  // Slug uniqueness: tries the base slug first, falls back to a random
  // suffix on collision (same pattern as the onboarding route).
  const baseSlug = makeSlug(name)
  let slug = baseSlug
  if (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`
  }

  const created = await prisma.restaurant.create({
    data: {
      organizationId: org.id,
      slug,
      name,
      currency,
    },
    select: { id: true, slug: true },
  })

  // Pin the new restaurant as active so the user lands inside it on the
  // redirect. Kept as a separate write from the create so a failure
  // here doesn't roll back the row — the user can still switch manually
  // via the dropdown.
  await prisma.session.update({
    where: { id: session.session.id },
    data: { activeRestaurantId: created.id, activeOrganizationId: org.id },
  })

  revalidatePath('/dashboard', 'layout')

  return NextResponse.json({ slug: created.slug })
}
