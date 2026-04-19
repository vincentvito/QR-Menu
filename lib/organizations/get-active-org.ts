import prisma from '@/lib/prisma'

interface ResolveInput {
  userId: string
  activeOrganizationId?: string | null
}

// Resolve the organization the user is currently acting on. Prefers the
// session's activeOrganizationId; falls back to their first membership.
// Returns null if the user has no memberships — callers should redirect
// to onboarding in that case.
export async function getActiveOrganization({ userId, activeOrganizationId }: ResolveInput) {
  if (activeOrganizationId) {
    const active = await prisma.organization.findFirst({
      where: {
        id: activeOrganizationId,
        members: { some: { userId } },
      },
    })
    if (active) return active
  }

  const membership = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  return membership?.organization ?? null
}
