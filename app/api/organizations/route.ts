import { NextResponse, after } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'
import { isSupportedCurrency } from '@/lib/menus/currency'
import { isWifiEncryption } from '@/lib/wifi'
import { normalizeSocialHandle } from '@/lib/socials'
import { isTemplateId } from '@/components/menu/templates'
import { isThemeId } from '@/lib/menus/themes'
import { isSeasonalOverlayId } from '@/lib/menus/seasonal-overlays'
import { deleteByUrl } from '@/lib/storage/r2'
import { canWriteDashboard } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

// Route name is legacy (predates the restaurant layer). Body still looks the
// same to clients, but writes are now split: name/logo go to Organization via
// better-auth, everything else is written directly to the active Restaurant.
// Phase 5 completed the migration; Organization no longer carries any of the
// restaurant-scoped columns.

const MAX_NAME = 120
const MAX_DESCRIPTION = 500
const MAX_WIFI_SSID = 32
const MAX_WIFI_PASSWORD = 63
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function cleanString(value: unknown, max: number): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function cleanHex(value: unknown): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  return HEX_RE.test(trimmed) ? trimmed.toUpperCase() : undefined
}

function cleanUrl(value: unknown): string | null | undefined {
  if (value === null) return null
  if (value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return undefined
  }
}

export async function PATCH(request: Request) {
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
  const writeGate = await canWriteDashboard(org.id)
  if (!writeGate.allowed) {
    return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const VALID_DOT_STYLES = new Set([
    'square',
    'dots',
    'rounded',
    'classy',
    'classy-rounded',
    'extra-rounded',
  ])
  const VALID_CORNER_STYLES = new Set(['square', 'dot', 'extra-rounded'])
  const VALID_CENTER_TYPES = new Set(['none', 'logo', 'text'])

  // org-level updates go to better-auth, restaurant-level updates go to
  // Prisma. Splitting up front keeps the two writes independent — either
  // can be empty and that's fine.
  const orgUpdates: Record<string, string> = {}
  const restaurantUpdates: Record<string, string | null> = {}

  if ('name' in body) {
    const cleaned = cleanString(body.name, MAX_NAME)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    if (cleaned === null) {
      return NextResponse.json({ error: 'Name can\u2019t be empty' }, { status: 400 })
    }
    orgUpdates.name = cleaned
    // Mirror to restaurant too — the settings form is titled "restaurant
    // name" so users expect it to drive the public-menu display name.
    restaurantUpdates.name = cleaned
  }

  if ('logo' in body) {
    const cleaned = cleanUrl(body.logo)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid logo URL' }, { status: 400 })
    }
    // Restaurant is the source of truth for logos. `organization.logo` is
    // vestigial (still in the schema, not yet dropped) and no longer
    // written — leaving it alone lets a future cleanup drop the column
    // without racing against live writes.
    restaurantUpdates.logo = cleaned
  }

  if ('description' in body) {
    const cleaned = cleanString(body.description, MAX_DESCRIPTION)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
    }
    restaurantUpdates.description = cleaned
  }

  if ('headerImage' in body) {
    const cleaned = cleanUrl(body.headerImage)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid header image URL' }, { status: 400 })
    }
    restaurantUpdates.headerImage = cleaned
  }

  if ('sourceUrl' in body) {
    const cleaned = cleanUrl(body.sourceUrl)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 })
    }
    restaurantUpdates.sourceUrl = cleaned
  }

  if ('primaryColor' in body) {
    const cleaned = cleanHex(body.primaryColor)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid primary color' }, { status: 400 })
    }
    restaurantUpdates.primaryColor = cleaned
  }

  if ('secondaryColor' in body) {
    const cleaned = cleanHex(body.secondaryColor)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid secondary color' }, { status: 400 })
    }
    restaurantUpdates.secondaryColor = cleaned
  }

  if ('headerTextColor' in body) {
    const cleaned = cleanHex(body.headerTextColor)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid header text color' }, { status: 400 })
    }
    restaurantUpdates.headerTextColor = cleaned
  }

  if ('currency' in body) {
    if (typeof body.currency !== 'string' || !isSupportedCurrency(body.currency)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }
    restaurantUpdates.currency = body.currency
  }

  if ('qrDotStyle' in body) {
    if (typeof body.qrDotStyle !== 'string' || !VALID_DOT_STYLES.has(body.qrDotStyle)) {
      return NextResponse.json({ error: 'Invalid QR dot style' }, { status: 400 })
    }
    restaurantUpdates.qrDotStyle = body.qrDotStyle
  }

  if ('qrCornerStyle' in body) {
    if (typeof body.qrCornerStyle !== 'string' || !VALID_CORNER_STYLES.has(body.qrCornerStyle)) {
      return NextResponse.json({ error: 'Invalid QR corner style' }, { status: 400 })
    }
    restaurantUpdates.qrCornerStyle = body.qrCornerStyle
  }

  if ('qrForegroundColor' in body) {
    const cleaned = cleanHex(body.qrForegroundColor)
    if (cleaned === undefined || cleaned === null) {
      return NextResponse.json({ error: 'Invalid QR foreground color' }, { status: 400 })
    }
    restaurantUpdates.qrForegroundColor = cleaned
  }

  if ('qrBackgroundColor' in body) {
    const cleaned = cleanHex(body.qrBackgroundColor)
    if (cleaned === undefined || cleaned === null) {
      return NextResponse.json({ error: 'Invalid QR background color' }, { status: 400 })
    }
    restaurantUpdates.qrBackgroundColor = cleaned
  }

  if ('qrCenterType' in body) {
    if (typeof body.qrCenterType !== 'string' || !VALID_CENTER_TYPES.has(body.qrCenterType)) {
      return NextResponse.json({ error: 'Invalid QR center type' }, { status: 400 })
    }
    restaurantUpdates.qrCenterType = body.qrCenterType
  }

  if ('qrCenterText' in body) {
    if (body.qrCenterText === null || body.qrCenterText === '') {
      restaurantUpdates.qrCenterText = null
    } else if (typeof body.qrCenterText === 'string') {
      restaurantUpdates.qrCenterText = body.qrCenterText.trim().slice(0, 4)
    } else {
      return NextResponse.json({ error: 'Invalid QR center text' }, { status: 400 })
    }
  }

  if ('wifiSsid' in body) {
    const cleaned = cleanString(body.wifiSsid, MAX_WIFI_SSID)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid WiFi SSID' }, { status: 400 })
    }
    restaurantUpdates.wifiSsid = cleaned
  }

  if ('wifiPassword' in body) {
    const cleaned = cleanString(body.wifiPassword, MAX_WIFI_PASSWORD)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid WiFi password' }, { status: 400 })
    }
    restaurantUpdates.wifiPassword = cleaned
  }

  if ('wifiEncryption' in body) {
    if (!isWifiEncryption(body.wifiEncryption)) {
      return NextResponse.json({ error: 'Invalid WiFi encryption' }, { status: 400 })
    }
    restaurantUpdates.wifiEncryption = body.wifiEncryption
  }

  if ('wifiCenterType' in body) {
    if (typeof body.wifiCenterType !== 'string' || !VALID_CENTER_TYPES.has(body.wifiCenterType)) {
      return NextResponse.json({ error: 'Invalid WiFi QR center type' }, { status: 400 })
    }
    restaurantUpdates.wifiCenterType = body.wifiCenterType
  }

  if ('wifiCenterText' in body) {
    if (body.wifiCenterText === null || body.wifiCenterText === '') {
      restaurantUpdates.wifiCenterText = null
    } else if (typeof body.wifiCenterText === 'string') {
      restaurantUpdates.wifiCenterText = body.wifiCenterText.trim().slice(0, 4)
    } else {
      return NextResponse.json({ error: 'Invalid WiFi QR center text' }, { status: 400 })
    }
  }

  if ('googleReviewUrl' in body) {
    const cleaned = cleanUrl(body.googleReviewUrl)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid Google review URL' }, { status: 400 })
    }
    restaurantUpdates.googleReviewUrl = cleaned
  }

  // Social handles — stored as the bare handle so the form round-trips
  // whatever the user pasted; public menu resolves to canonical URL at render.
  const HANDLE_KEYS = ['instagramUrl', 'tiktokUrl', 'facebookUrl'] as const
  for (const key of HANDLE_KEYS) {
    if (key in body) {
      const raw = body[key]
      if (raw !== null && typeof raw !== 'string') {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
      }
      restaurantUpdates[key] = raw ? normalizeSocialHandle(raw).slice(0, 64) : null
    }
  }

  if ('templateId' in body) {
    if (!isTemplateId(body.templateId)) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
    }
    restaurantUpdates.templateId = body.templateId
  }

  if ('theme' in body) {
    if (!isThemeId(body.theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }
    restaurantUpdates.theme = body.theme
  }

  if ('seasonalOverlay' in body) {
    if (!isSeasonalOverlayId(body.seasonalOverlay)) {
      return NextResponse.json({ error: 'Invalid seasonal overlay' }, { status: 400 })
    }
    restaurantUpdates.seasonalOverlay = body.seasonalOverlay
  }

  if (Object.keys(orgUpdates).length === 0 && Object.keys(restaurantUpdates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Resolve the active restaurant up front — we need its id for both the
  // previous-header-image lookup (so we can clean up the old R2 object) and
  // the write itself. Skips the write when readOnly (plan downgrade).
  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const activeRestaurant = await getActiveRestaurant(org.id, activeRestaurantId, session.user.id)
  if (activeRestaurant?.readOnly) {
    return NextResponse.json(
      {
        error:
          'This restaurant is read-only under your current plan. Activate it from Billing or upgrade your plan.',
        gate: 'restaurant-read-only',
      },
      { status: 402 },
    )
  }

  let previousHeaderImage: string | null = null
  if ('headerImage' in restaurantUpdates && activeRestaurant) {
    const current = await prisma.restaurant.findUnique({
      where: { id: activeRestaurant.id },
      select: { headerImage: true },
    })
    previousHeaderImage = current?.headerImage ?? null
  }

  if (Object.keys(orgUpdates).length > 0) {
    const updated = await auth.api.updateOrganization({
      body: { organizationId: org.id, data: orgUpdates },
      headers: requestHeaders,
    })
    if (!updated) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
  }

  if (
    Object.keys(restaurantUpdates).length > 0 &&
    activeRestaurant &&
    !activeRestaurant.readOnly
  ) {
    await prisma.restaurant.update({
      where: { id: activeRestaurant.id },
      data: restaurantUpdates,
    })
  }

  const newHeaderImage = restaurantUpdates.headerImage as string | null | undefined
  if (previousHeaderImage && previousHeaderImage !== newHeaderImage) {
    after(() => deleteByUrl(previousHeaderImage))
  }

  revalidatePath('/dashboard', 'layout')
  revalidatePath('/m/[slug]', 'page')

  return NextResponse.json({ ok: true })
}
