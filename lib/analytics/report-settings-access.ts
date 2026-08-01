import 'server-only'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

interface AccessFailure {
  ok: false
  status: number
  // Fully-qualified key in the `Api` messages namespace.
  messageKey: string
  params?: Record<string, string | number>
}

function failure(
  status: number,
  messageKey: string,
  params?: Record<string, string | number>,
): AccessFailure {
  return { ok: false, status, messageKey, params }
}

export async function getAnalyticsReportSettingsAccess() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return failure(401, 'common.notSignedIn')

  const organization = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!organization) return failure(409, 'common.noActiveOrganization')

  const membership = await prisma.member.findFirst({
    where: { organizationId: organization.id, userId: session.user.id },
    select: { role: true },
  })
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return failure(403, 'common.notAllowed')
  }

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(organization.id, activeRestaurantId, session.user.id)
  if (!restaurant) return failure(409, 'common.noActiveRestaurant')

  // Report delivery is a restaurant setting, so it follows the same billing
  // gate as the rest of Settings: lapsed subscriptions and read-only
  // restaurants are view-only.
  const gate = await canWriteRestaurant(organization.id, restaurant.id)
  if (!gate.allowed) {
    return failure(402, gate.reason?.key ?? 'common.notAllowed', gate.reason?.params)
  }

  return { ok: true as const, session, organization, restaurant }
}
