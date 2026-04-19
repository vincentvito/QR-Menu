import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITABLE_ROLES = new Set(['admin', 'member'])

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
    return NextResponse.json({ error: 'No active restaurant' }, { status: 409 })
  }

  const membership = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  let body: { email?: unknown; role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const role = typeof body.role === 'string' ? body.role : 'member'
  if (!INVITABLE_ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  try {
    const invitation = await auth.api.createInvitation({
      body: { email, role: role as 'admin' | 'member', organizationId: org.id },
      headers: requestHeaders,
    })
    return NextResponse.json({ id: invitation?.id, email, role })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invite failed'
    console.error('[api/invitations] create failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const url = new URL(request.url)
  const invitationId = url.searchParams.get('id')
  if (!invitationId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: requestHeaders,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cancel failed'
    console.error('[api/invitations] cancel failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
