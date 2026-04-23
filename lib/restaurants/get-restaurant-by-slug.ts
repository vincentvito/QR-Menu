import prisma from '@/lib/prisma'

// Looks up a restaurant by its URL slug and confirms the user can access it
// (org-level membership for now; phase 4 extends this to RestaurantMember).
// Returns null when not found or when the user lacks access — callers notFound()
// either way to avoid leaking existence.
export async function getRestaurantBySlug(slug: string, userId: string) {
  return prisma.restaurant.findFirst({
    where: {
      slug,
      organization: { members: { some: { userId } } },
    },
  })
}
