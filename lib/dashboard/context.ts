import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'

// Resolves session, active organization, and the viewer's role in a single
// cached call. React.cache dedupes within one request — so the dashboard
// layout and each /dashboard/* page share one round-trip instead of each
// paying its own.
//
// Redirects are part of the contract: no session → /auth/login, no org →
// /onboarding. Callers can trust the return value is always populated.
export const getDashboardContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login?callbackUrl=/dashboard')

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) redirect('/onboarding')

  const membership = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })

  return {
    session,
    org,
    role: membership?.role ?? 'member',
  }
})
