import prisma from '@/lib/prisma'

// Resolves the restaurant the user is currently acting on within an
// organization. Honors `session.activeRestaurantId` when set (populated by
// the restaurant-switcher UI); otherwise falls back to the org's first
// restaurant so pages stay functional even when session state is fresh.
//
// When `userId` is passed, scopes the fallback to restaurants the user can
// actually access (org-level Member grants access to all restaurants in the
// org; RestaurantMember only grants access to that specific restaurant).
// Restaurant-scoped staff need this or they'd land on a restaurant they
// can't see data for.
export async function getActiveRestaurant(
  organizationId: string,
  activeRestaurantId?: string | null,
  userId?: string | null,
) {
  if (activeRestaurantId) {
    const where = userId
      ? {
          id: activeRestaurantId,
          organizationId,
          OR: [
            { organization: { members: { some: { userId } } } },
            { members: { some: { userId } } },
          ],
        }
      : { id: activeRestaurantId, organizationId }
    const active = await prisma.restaurant.findFirst({ where })
    if (active) return active
  }
  const where = userId
    ? {
        organizationId,
        OR: [
          { organization: { members: { some: { userId } } } },
          { members: { some: { userId } } },
        ],
      }
    : { organizationId }
  return prisma.restaurant.findFirst({
    where,
    orderBy: { createdAt: 'asc' },
  })
}
