import prisma from '@/lib/prisma'

// Return the first membership for a user, or null if they have none.
// Used by the post-login gate to decide between onboarding and dashboard.
export async function getActiveMembership(userId: string) {
  return prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
}
