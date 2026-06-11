import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

// Persist the user's active restaurant on their current session. Verifies
// access (member of the owning organization) before writing; also pins
// activeOrganizationId so a cross-org switch updates both in one call.
export async function POST(request: Request) {
  const t = await getTranslations('Api')
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  let body: { restaurantId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId : null
  if (!restaurantId) {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  // Access check: restaurant must belong to an org the user is a member of.
  // Phase 4 extends this to accept RestaurantMember rows too.
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      organization: { members: { some: { userId: session.user.id } } },
    },
    select: { id: true, organizationId: true },
  })
  if (!restaurant) {
    return NextResponse.json({ error: t('common.restaurantNotFound') }, { status: 404 })
  }

  await prisma.session.update({
    where: { id: session.session.id },
    data: {
      activeRestaurantId: restaurant.id,
      activeOrganizationId: restaurant.organizationId,
    },
  })

  // Every dashboard page picks up the new active restaurant on next render.
  revalidatePath('/dashboard', 'layout')

  return NextResponse.json({ ok: true })
}
