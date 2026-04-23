import prisma from '@/lib/prisma'

interface ResolveInput {
  userId: string
  activeOrganizationId?: string | null
}

// Resolve the organization the user is currently acting on. Order of preference:
//   1. session.activeOrganizationId, if the user is still a member of it
//   2. their oldest org-level Member (account admins/owners)
//   3. the org that owns their oldest RestaurantMember (restaurant-scoped staff)
// Returns null only when the user has no access to any org.
export async function getActiveOrganization({ userId, activeOrganizationId }: ResolveInput) {
  if (activeOrganizationId) {
    const active = await prisma.organization.findFirst({
      where: {
        id: activeOrganizationId,
        OR: [
          { members: { some: { userId } } },
          { restaurants: { some: { members: { some: { userId } } } } },
        ],
      },
    })
    if (active) return active
  }

  const membership = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  if (membership) return membership.organization

  // Restaurant-scoped staff: no org-level Member, only RestaurantMember rows.
  // Fall back to the org that owns their oldest restaurant membership.
  const staff = await prisma.restaurantMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { restaurant: { include: { organization: true } } },
  })
  return staff?.restaurant.organization ?? null
}
