import prisma from '@/lib/prisma'

export interface PlatformStats {
  users: { total: number; today: number; last7Days: number }
  organizations: { total: number; comped: number; paying: number; trialing: number; lapsed: number }
  restaurants: { total: number; active: number }
  menus: { total: number; items: number }
  invitations: { pending: number }
}

export interface SignupsPoint {
  date: string // YYYY-MM-DD
  count: number
}

// Buckets signups per day for the last N days, filling empty days with 0.
// Low user counts: findMany + in-memory bucket is fine. Swap to a raw query
// with date_trunc once we're past ~100k users.
export async function getSignupsByDay(days = 30): Promise<SignupsPoint[]> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (days - 1))

  const rows = await prisma.user.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  })

  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = toDateKey(row.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const points: SignupsPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateKey(d)
    points.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return points
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Pulls all platform-level stats in parallel. Used by /admin overview.
export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    usersToday,
    usersLast7,
    organizations,
    totalRestaurants,
    activeRestaurants,
    totalMenus,
    totalItems,
    pendingInvitations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.organization.findMany({
      select: { id: true, compPlan: true },
    }),
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { readOnly: false } }),
    prisma.menu.count(),
    prisma.menuItem.count(),
    prisma.invitation.count({ where: { status: 'pending' } }),
  ])

  const orgIds = organizations.map((org) => org.id)
  const subscriptions =
    orgIds.length > 0
      ? await prisma.subscription.findMany({
          where: { referenceId: { in: orgIds } },
          orderBy: { updatedAt: 'desc' },
          select: { referenceId: true, status: true },
        })
      : []
  const latestByOrg = new Map<string, (typeof subscriptions)[number]>()
  for (const subscription of subscriptions) {
    if (!latestByOrg.has(subscription.referenceId)) {
      latestByOrg.set(subscription.referenceId, subscription)
    }
  }

  let comped = 0
  let paying = 0
  let trialing = 0
  let lapsed = 0
  for (const org of organizations) {
    if (org.compPlan) {
      comped += 1
      continue
    }
    const latest = latestByOrg.get(org.id)
    if (!latest) continue
    if (latest.status === 'trialing') trialing += 1
    else if (latest.status === 'active' || latest.status === 'past_due') paying += 1
    else lapsed += 1
  }

  return {
    users: { total: totalUsers, today: usersToday, last7Days: usersLast7 },
    organizations: {
      total: organizations.length,
      comped,
      paying,
      trialing,
      lapsed,
    },
    restaurants: { total: totalRestaurants, active: activeRestaurants },
    menus: { total: totalMenus, items: totalItems },
    invitations: { pending: pendingInvitations },
  }
}
