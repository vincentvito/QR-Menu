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

// Revoke a pending invitation. Only owners/admins of the owning org can do this.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  const invitation = await prisma.restaurantInvitation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      restaurant: { select: { organizationId: true } },
    },
  })
  if (!invitation) {
    return NextResponse.json({ error: t('common.invitationNotFound') }, { status: 404 })
  }

  const member = await prisma.member.findFirst({
    where: { organizationId: invitation.restaurant.organizationId, userId: session.user.id },
    select: { role: true },
  })
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: t('common.notAllowed') }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(invitation.restaurant.organizationId)
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

  if (invitation.status === 'pending') {
    await prisma.restaurantInvitation.update({
      where: { id: invitation.id },
      data: { status: 'canceled' },
    })
  }
  return NextResponse.json({ ok: true })
}
