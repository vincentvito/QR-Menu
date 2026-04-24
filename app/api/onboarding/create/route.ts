import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { makeSlug } from '@/lib/menus/slug'
import { isSupportedCurrency, DEFAULT_CURRENCY } from '@/lib/menus/currency'

const MAX_USER_NAME = 120

export const runtime = 'nodejs'

const MAX_NAME = 120
const MAX_DESCRIPTION = 500
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed || undefined
}

function cleanHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return HEX_RE.test(trimmed) ? trimmed.toUpperCase() : undefined
}

function cleanUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  try {
    return new URL(trimmed).toString()
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // Enforce the "1 org per user for now" rule. Fails cleanly if someone
  // retries the onboarding after already creating an org.
  const existing = await prisma.member.findFirst({ where: { userId: session.user.id } })
  if (existing) {
    return NextResponse.json({ error: 'You already belong to a restaurant' }, { status: 409 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = cleanString(body.name, MAX_NAME)
  if (!name) {
    return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 })
  }

  // Persist a display name on the user if the onboarding form supplied one.
  // OTP signup skips this, so onboarding is often the first chance to set it.
  const userName = cleanString(body.userName, MAX_USER_NAME)
  if (userName && userName !== session.user.name) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: userName },
    })
  }

  const currencyRaw =
    typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : DEFAULT_CURRENCY
  const currency = isSupportedCurrency(currencyRaw) ? currencyRaw : DEFAULT_CURRENCY

  // Organization keeps only account-level fields (name, slug, logo).
  // Everything restaurant-specific goes on the Restaurant row below.
  const slug = makeSlug(name)
  const restaurantFields = {
    description: cleanString(body.description, MAX_DESCRIPTION) ?? null,
    primaryColor: cleanHex(body.primaryColor) ?? null,
    secondaryColor: cleanHex(body.secondaryColor) ?? null,
    currency,
    sourceUrl: cleanUrl(body.sourceUrl) ?? null,
    logo: cleanUrl(body.logo) ?? null,
  }

  // Logo is stored on the Restaurant row above (source of truth). Not
  // passing it to createOrganization keeps `organization.logo` permanently
  // null, simplifying the eventual column drop.
  const organization = await auth.api.createOrganization({
    body: { name, slug },
    headers: requestHeaders,
  })

  if (!organization) {
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 })
  }

  // If the derived restaurant slug collides (rare), append a short suffix.
  let restaurantSlug = slug
  if (await prisma.restaurant.findUnique({ where: { slug: restaurantSlug } })) {
    restaurantSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`
  }

  await prisma.restaurant.create({
    data: {
      organizationId: organization.id,
      slug: restaurantSlug,
      name,
      ...restaurantFields,
    },
  })

  // Subscription rows are created by the @better-auth/stripe plugin on first
  // checkout. Until then, resolvePlan() reads the absence as "trial".

  await auth.api.setActiveOrganization({
    body: { organizationId: organization.id },
    headers: requestHeaders,
  })

  return NextResponse.json({ id: organization.id, slug: organization.slug })
}
