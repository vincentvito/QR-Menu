import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { CREDIT_PACK } from '@/lib/plans'
import { canWriteDashboard } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

// Creates a one-time Stripe Checkout session to buy a credit pack. The
// @better-auth/stripe plugin only manages recurring subscriptions, so the
// one-time purchase flow is implemented directly against Stripe here. On
// success the webhook in lib/auth.ts `onEvent` reads `metadata.organizationId`
// + `metadata.kind` and grants the credits via `grantBonusCredits`.
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_CREDIT_PACK_100
  if (!secretKey || !priceId) {
    return NextResponse.json(
      { error: 'Credit-pack checkout is not configured on this environment.' },
      { status: 503 },
    )
  }

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

  const member = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(org.id)
  if (!writeGate.allowed) {
    return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' })

  // Ensure the org has a Stripe customer. Normally the @better-auth/stripe
  // plugin creates one when the org first enters a subscription flow, but a
  // user could in theory click "Buy credits" before ever subscribing.
  const orgRow = await prisma.organization.findUnique({
    where: { id: org.id },
    select: { stripeCustomerId: true, name: true },
  })
  let customerId = orgRow?.stripeCustomerId ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: orgRow?.name ?? org.name,
      metadata: { organizationId: org.id },
    })
    customerId = customer.id
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const origin =
    requestHeaders.get('origin') ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000'

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_intent_data: {
      metadata: {
        organizationId: org.id,
        kind: 'credit-pack-100',
      },
    },
    metadata: {
      organizationId: org.id,
      kind: 'credit-pack-100',
      credits: String(CREDIT_PACK.credits),
    },
    success_url: `${origin}/dashboard/billing?creditPack=success`,
    cancel_url: `${origin}/dashboard/billing?creditPack=cancel`,
  })

  if (!checkout.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }

  return NextResponse.json({ url: checkout.url })
}
