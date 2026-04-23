import prisma from '@/lib/prisma'
import { resolvePlan } from '@/lib/plans'

// Keep Restaurant.readOnly consistent with the org's current plan cap.
// Called after any subscription lifecycle event that might have changed
// maxRestaurants. Policy:
//   - Over cap: oldest N restaurants stay active, rest become readOnly.
//   - Under cap (or unlimited): everything flips back to active.
// The billing UI's activation picker can override these defaults; this is
// just the automatic "don't leave the user in a broken state" baseline.
export async function reconcileRestaurantActivation(organizationId: string): Promise<void> {
  const [subscription, org, restaurants] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        referenceId: organizationId,
        status: { in: ['trialing', 'active', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { maxRestaurantsOverride: true, monthlyCreditsOverride: true },
    }),
    prisma.restaurant.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, readOnly: true },
    }),
  ])

  const plan = resolvePlan(subscription, org)
  const cap = plan.maxRestaurants

  // Unlimited or under cap: clear readOnly on any restaurant that still has it.
  if (cap === null || restaurants.length <= cap) {
    const toActivate = restaurants.filter((r) => r.readOnly).map((r) => r.id)
    if (toActivate.length > 0) {
      await prisma.restaurant.updateMany({
        where: { id: { in: toActivate } },
        data: { readOnly: false },
      })
    }
    return
  }

  // Over cap: oldest `cap` stay active; rest become readOnly.
  const staying = new Set(restaurants.slice(0, cap).map((r) => r.id))
  const operations: Array<Promise<unknown>> = []
  const toActivate: string[] = []
  const toFreeze: string[] = []
  for (const r of restaurants) {
    const shouldBeReadOnly = !staying.has(r.id)
    if (shouldBeReadOnly && !r.readOnly) toFreeze.push(r.id)
    if (!shouldBeReadOnly && r.readOnly) toActivate.push(r.id)
  }
  if (toFreeze.length > 0) {
    operations.push(
      prisma.restaurant.updateMany({
        where: { id: { in: toFreeze } },
        data: { readOnly: true },
      }),
    )
  }
  if (toActivate.length > 0) {
    operations.push(
      prisma.restaurant.updateMany({
        where: { id: { in: toActivate } },
        data: { readOnly: false },
      }),
    )
  }
  await Promise.all(operations)
}
