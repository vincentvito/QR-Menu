import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'
import { sendEmail } from '@/lib/email'
import { restaurantInviteEmailTemplate } from '@/lib/email-templates'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['manager', 'waiter'])
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

// Owner/admin gate — only people who can manage the org may invite staff
// to a restaurant in that org. Restaurant-scoped "manager" staff can't
// invite further — keeps the trust graph flat.
async function requireOrgAdmin(orgId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { organizationId: orgId, userId },
    select: { role: true },
  })
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return null
  }
  return member
}

// POST = create a new invitation + send the email.
export async function POST(request: Request) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) {
    return NextResponse.json({ error: 'No active organization' }, { status: 409 })
  }

  if (!(await requireOrgAdmin(org.id, session.user.id))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(org.id, activeRestaurantId, session.user.id)
  if (!restaurant) {
    return NextResponse.json({ error: 'No active restaurant' }, { status: 409 })
  }

  let body: { email?: unknown; role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = typeof body.role === 'string' ? body.role : 'waiter'
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Reject if there's already a pending invite or an active membership for
  // this email at this restaurant — prevents accidental double-invites.
  const existingInvite = await prisma.restaurantInvitation.findFirst({
    where: { restaurantId: restaurant.id, email, status: 'pending' },
    select: { id: true },
  })
  if (existingInvite) {
    return NextResponse.json(
      { error: 'An invitation is already pending for this email' },
      { status: 409 },
    )
  }
  const existingMember = await prisma.restaurantMember.findFirst({
    where: { restaurantId: restaurant.id, user: { email } },
    select: { id: true },
  })
  if (existingMember) {
    return NextResponse.json(
      { error: 'That person is already on this restaurant' },
      { status: 409 },
    )
  }

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const invitation = await prisma.restaurantInvitation.create({
    data: {
      restaurantId: restaurant.id,
      email,
      role,
      token,
      status: 'pending',
      expiresAt,
      inviterId: session.user.id,
    },
  })

  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  const acceptUrl = `${baseUrl}/accept-restaurant-invite?token=${token}`
  const inviterName = session.user.name?.trim() || session.user.email
  const { subject, html } = restaurantInviteEmailTemplate({
    inviterName,
    restaurantName: restaurant.name,
    role,
    acceptUrl,
  })
  await sendEmail({ to: email, subject, html })

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  })
}

// GET = list pending invitations for the active restaurant.
export async function GET() {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) return NextResponse.json({ invitations: [] })

  if (!(await requireOrgAdmin(org.id, session.user.id))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(org.id, activeRestaurantId, session.user.id)
  if (!restaurant) return NextResponse.json({ invitations: [] })

  const invitations = await prisma.restaurantInvitation.findMany({
    where: { restaurantId: restaurant.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      expiresAt: true,
    },
  })
  return NextResponse.json({ invitations })
}
