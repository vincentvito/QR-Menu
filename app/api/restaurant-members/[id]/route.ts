import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canWriteDashboard } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Remove a staff member from a restaurant. Only owners/admins of the owning
// org can do this. Users cannot remove themselves from here — they'd use a
// separate "leave restaurant" flow (not built yet).
export async function DELETE(_request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  const member = await prisma.restaurantMember.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      restaurant: { select: { organizationId: true } },
    },
  })
  if (!member) {
    return NextResponse.json({ error: t('common.memberNotFound') }, { status: 404 })
  }

  const actor = await prisma.member.findFirst({
    where: { organizationId: member.restaurant.organizationId, userId: session.user.id },
    select: { role: true },
  })
  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: t('common.notAllowed') }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(member.restaurant.organizationId)
  if (!writeGate.allowed) {
    return NextResponse.json(
      {
        error: writeGate.reason
          ? t(writeGate.reason.key, writeGate.reason.params)
          : t('gates.subscriptionLapsed'),
        gate: writeGate.gate,
      },
      { status: 402 },
    )
  }

  await prisma.restaurantMember.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
