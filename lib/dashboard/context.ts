import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'

// Resolves session, active organization, active restaurant, and the viewer's
// role in a single cached call. React.cache dedupes within one request — so
// the dashboard layout and each /dashboard/* page share one round-trip
// instead of each paying its own.
//
// Redirects are part of the contract: no session → /auth/login, no org or
// no restaurant → /onboarding. Callers can trust the return value is always
// populated.
export const getDashboardContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login?callbackUrl=/dashboard')

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) redirect('/onboarding')

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(org.id, activeRestaurantId, session.user.id)
  if (!restaurant) redirect('/onboarding')

  const [orgMembership, restaurantMembership, restaurants] = await Promise.all([
    prisma.member.findFirst({
      where: { organizationId: org.id, userId: session.user.id },
      select: { role: true },
    }),
    prisma.restaurantMember.findFirst({
      where: { restaurantId: restaurant.id, userId: session.user.id },
      select: { role: true },
    }),
    // Union of every restaurant the user can switch between:
    // - every restaurant in orgs where they're an org-level Member (account
    //   admins/owners see all)
    // - every restaurant where they have a direct RestaurantMember row
    //   (restaurant-scoped staff see only theirs)
    prisma.restaurant.findMany({
      where: {
        OR: [
          { organization: { members: { some: { userId: session.user.id } } } },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, name: true, organizationId: true },
    }),
  ])

  // Org-level role wins (owner/admin/member). Falls back to the
  // restaurant-level role ("manager"/"waiter") for staff who have no
  // org-level Member row at all. UI can branch on `scope` when it needs
  // to hide account-level controls from staff.
  const scope: 'org' | 'restaurant' = orgMembership ? 'org' : 'restaurant'
  const role = orgMembership?.role ?? restaurantMembership?.role ?? 'guest'

  return {
    session,
    org,
    restaurant,
    restaurants,
    role,
    scope,
  }
})
