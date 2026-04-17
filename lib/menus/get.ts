import { cache } from 'react'
import prisma from '@/lib/prisma'

// Resolves a menu by slug and confirms the caller owns it. Use at the top of
// any mutating route. Throws an object with `status` that callers can map to
// HTTP responses (404 missing, 403 wrong owner).
export async function requireMenuOwner(slug: string, userId: string) {
  const menu = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true, userId: true, slug: true },
  })
  if (!menu) throw Object.assign(new Error('Menu not found'), { status: 404 })
  if (menu.userId !== userId) {
    throw Object.assign(new Error('Not your menu'), { status: 403 })
  }
  return menu
}

// React.cache() dedupes per-request. Public menu page calls this once in
// generateMetadata and once in the page component — with cache() only one
// query actually hits Postgres.
export const getMenuBySlug = cache(async (slug: string) => {
  return prisma.menu.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { order: 'asc' } },
    },
  })
})

export async function getMenusForUser(userId: string) {
  return prisma.menu.findMany({
    where: { userId },
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
