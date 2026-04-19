import { cache } from 'react'
import prisma from '@/lib/prisma'

// Resolves a menu by slug and confirms the caller has access via membership
// in the menu's organization. Throws with `status` callers map to HTTP.
export async function requireMenuAccess(slug: string, userId: string) {
  const menu = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true, slug: true, organizationId: true },
  })
  if (!menu) throw Object.assign(new Error('Menu not found'), { status: 404 })

  const membership = await prisma.member.findFirst({
    where: { organizationId: menu.organizationId, userId },
    select: { id: true, role: true },
  })
  if (!membership) {
    throw Object.assign(new Error('Not your menu'), { status: 403 })
  }
  return { ...menu, role: membership.role }
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
