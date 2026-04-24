import { cache } from 'react'
import prisma from '@/lib/prisma'

// Resolves a menu by slug and confirms the caller has access. Two access
// paths:
//   - Org-level Member (owner/admin/member) — full access to every menu in
//     every restaurant under the org.
//   - Restaurant-level RestaurantMember (manager/waiter) — access only to
//     menus whose `restaurantId` matches their restaurant membership.
// Throws with `status` callers map to HTTP.
export async function requireMenuAccess(slug: string, userId: string) {
  const menu = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true, slug: true, organizationId: true, restaurantId: true },
  })
  if (!menu) throw Object.assign(new Error('Menu not found'), { status: 404 })

  const orgMember = await prisma.member.findFirst({
    where: { organizationId: menu.organizationId, userId },
    select: { role: true },
  })
  if (orgMember) return { ...menu, role: orgMember.role }

  if (menu.restaurantId) {
    const restaurantMember = await prisma.restaurantMember.findFirst({
      where: { restaurantId: menu.restaurantId, userId },
      select: { role: true },
    })
    if (restaurantMember) return { ...menu, role: restaurantMember.role }
  }

  throw Object.assign(new Error('Not your menu'), { status: 403 })
}

// React.cache() dedupes per-request. Public menu page calls this once in
// generateMetadata and once in the page component — with cache() only one
// query actually hits Postgres.
export const getMenuBySlug = cache(async (slug: string) => {
  return prisma.menu.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { order: 'asc' } },
      organization: true,
      restaurant: true,
    },
  })
})

export async function getMenusForOrg(organizationId: string) {
  return prisma.menu.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  })
}

export async function getMenusForRestaurant(restaurantId: string) {
  return prisma.menu.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  })
}

// Items grouped by category, preserving first-seen order within each category
// (items are already sorted by their `order` field).
export function groupByCategory<T extends { category: string }>(items: T[]) {
  const order: string[] = []
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = item.category || 'Other'
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(item)
  }
  return order.map((category) => ({ category, items: groups.get(category)! }))
}
