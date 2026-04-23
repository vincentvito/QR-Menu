import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

// Accept a restaurant invitation. Creates a RestaurantMember row for the
// signed-in user, marks the invitation accepted, and pins the restaurant
// (and its owning org) on the session so the user lands on it.
export async function POST(request: Request) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: { token?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const invitation = await prisma.restaurantInvitation.findUnique({
    where: { token },
    include: { restaurant: { select: { id: true, organizationId: true, name: true } } },
  })
  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already used or canceled' }, { status: 409 })
  }
  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
  }
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email' },
      { status: 403 },
    )
  }

  await prisma.$transaction([
    prisma.restaurantMember.upsert({
      where: {
        restaurantId_userId: {
          restaurantId: invitation.restaurant.id,
          userId: session.user.id,
        },
      },
      create: {
        restaurantId: invitation.restaurant.id,
        userId: session.user.id,
        role: invitation.role,
      },
      // If a member already exists (rare — shouldn't happen since we reject
      // duplicate invites), update the role so the most recent invitation wins.
      update: { role: invitation.role },
    }),
    prisma.restaurantInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    }),
    prisma.session.update({
      where: { id: session.session.id },
      data: {
        activeOrganizationId: invitation.restaurant.organizationId,
        activeRestaurantId: invitation.restaurant.id,
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    restaurantId: invitation.restaurant.id,
    restaurantName: invitation.restaurant.name,
  })
}
