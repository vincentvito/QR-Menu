import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { isSupportedCurrency } from '@/lib/menus/currency'
import { isWifiEncryption } from '@/lib/wifi'
import { normalizeSocialHandle } from '@/lib/socials'
import { isBadgeKey } from '@/lib/menus/badges'
import { isTemplateId } from '@/components/menu/templates'
import { isThemeId } from '@/lib/menus/themes'
import { isSeasonalOverlayId } from '@/lib/menus/seasonal-overlays'

export const runtime = 'nodejs'

const MAX_NAME = 120
const MAX_DESCRIPTION = 500
const MAX_WIFI_SSID = 32 // IEEE 802.11 SSID max
const MAX_WIFI_PASSWORD = 63 // WPA2 PSK max
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
  // Auto-prepend https:// so owners can paste "example.com/page" without
  // being forced to type the scheme — common when copying from address bars.
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

  // Role gate: only owner or admin can edit restaurant settings.
  // `member` is reserved for future employee invites (Phase 6).
  const membership = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, string | string[] | null> = {}

  if ('name' in body) {
    const cleaned = cleanString(body.name, MAX_NAME)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    if (cleaned === null) {
      return NextResponse.json({ error: 'Name can\u2019t be empty' }, { status: 400 })
    }
    updates.name = cleaned
  }

  if ('description' in body) {
    const cleaned = cleanString(body.description, MAX_DESCRIPTION)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
    }
    updates.description = cleaned
  }

  // better-auth's additionalFields schema rejects null on optional string
  // fields — persist "" to clear instead. Treated as "not set" everywhere.
  if ('logo' in body) {
    const cleaned = cleanUrl(body.logo)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid logo URL' }, { status: 400 })
    }
    updates.logo = cleaned ?? ''
  }

  if ('sourceUrl' in body) {
    const cleaned = cleanUrl(body.sourceUrl)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 })
    }
    updates.sourceUrl = cleaned ?? ''
  }

  if ('primaryColor' in body) {
    const cleaned = cleanHex(body.primaryColor)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid primary color' }, { status: 400 })
    }
    updates.primaryColor = cleaned
  }

  if ('secondaryColor' in body) {
    const cleaned = cleanHex(body.secondaryColor)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid secondary color' }, { status: 400 })
    }
    updates.secondaryColor = cleaned
  }

  if ('currency' in body) {
    if (typeof body.currency !== 'string' || !isSupportedCurrency(body.currency)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }
    updates.currency = body.currency
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

  if ('qrDotStyle' in body) {
    if (typeof body.qrDotStyle !== 'string' || !VALID_DOT_STYLES.has(body.qrDotStyle)) {
      return NextResponse.json({ error: 'Invalid QR dot style' }, { status: 400 })
    }
    updates.qrDotStyle = body.qrDotStyle
  }

  if ('qrCornerStyle' in body) {
    if (typeof body.qrCornerStyle !== 'string' || !VALID_CORNER_STYLES.has(body.qrCornerStyle)) {
      return NextResponse.json({ error: 'Invalid QR corner style' }, { status: 400 })
    }
    updates.qrCornerStyle = body.qrCornerStyle
  }

  if ('qrForegroundColor' in body) {
    const cleaned = cleanHex(body.qrForegroundColor)
    if (cleaned === undefined || cleaned === null) {
      return NextResponse.json({ error: 'Invalid QR foreground color' }, { status: 400 })
    }
    updates.qrForegroundColor = cleaned
  }

  if ('qrBackgroundColor' in body) {
    const cleaned = cleanHex(body.qrBackgroundColor)
    if (cleaned === undefined || cleaned === null) {
      return NextResponse.json({ error: 'Invalid QR background color' }, { status: 400 })
    }
    updates.qrBackgroundColor = cleaned
  }

  const VALID_CENTER_TYPES = new Set(['none', 'logo', 'text'])
  if ('qrCenterType' in body) {
    if (typeof body.qrCenterType !== 'string' || !VALID_CENTER_TYPES.has(body.qrCenterType)) {
      return NextResponse.json({ error: 'Invalid QR center type' }, { status: 400 })
    }
    updates.qrCenterType = body.qrCenterType
  }

  if ('qrCenterText' in body) {
    if (body.qrCenterText === null || body.qrCenterText === '') {
      updates.qrCenterText = null
    } else if (typeof body.qrCenterText === 'string') {
      updates.qrCenterText = body.qrCenterText.trim().slice(0, 4)
    } else {
      return NextResponse.json({ error: 'Invalid QR center text' }, { status: 400 })
    }
  }

  // better-auth's additionalFields schema rejects null even for optional
  // strings, so we persist "" to clear instead of null. Behaviorally the
  // same — the public menu treats an empty SSID/text as "not set".
  if ('wifiSsid' in body) {
    const cleaned = cleanString(body.wifiSsid, MAX_WIFI_SSID)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid WiFi SSID' }, { status: 400 })
    }
    updates.wifiSsid = cleaned ?? ''
  }

  if ('wifiPassword' in body) {
    const cleaned = cleanString(body.wifiPassword, MAX_WIFI_PASSWORD)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid WiFi password' }, { status: 400 })
    }
    updates.wifiPassword = cleaned ?? ''
  }

  if ('wifiEncryption' in body) {
    if (!isWifiEncryption(body.wifiEncryption)) {
      return NextResponse.json({ error: 'Invalid WiFi encryption' }, { status: 400 })
    }
    updates.wifiEncryption = body.wifiEncryption
  }

  if ('wifiCenterType' in body) {
    if (typeof body.wifiCenterType !== 'string' || !VALID_CENTER_TYPES.has(body.wifiCenterType)) {
      return NextResponse.json({ error: 'Invalid WiFi QR center type' }, { status: 400 })
    }
    updates.wifiCenterType = body.wifiCenterType
  }

  if ('wifiCenterText' in body) {
    if (body.wifiCenterText === null || body.wifiCenterText === '') {
      updates.wifiCenterText = ''
    } else if (typeof body.wifiCenterText === 'string') {
      updates.wifiCenterText = body.wifiCenterText.trim().slice(0, 4)
    } else {
      return NextResponse.json({ error: 'Invalid WiFi QR center text' }, { status: 400 })
    }
  }

  if ('googleReviewUrl' in body) {
    const cleaned = cleanUrl(body.googleReviewUrl)
    if (cleaned === undefined) {
      return NextResponse.json({ error: 'Invalid Google review URL' }, { status: 400 })
    }
    updates.googleReviewUrl = cleaned ?? ''
  }

  // Social fields accept a handle, @handle, or a pasted URL — all stored
  // as just the handle so the settings form round-trips what was entered
  // and the public menu constructs the canonical URL at render.
  const HANDLE_KEYS = ['instagramUrl', 'tiktokUrl', 'facebookUrl'] as const
  for (const key of HANDLE_KEYS) {
    if (key in body) {
      const raw = body[key]
      if (raw !== null && typeof raw !== 'string') {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
      }
      updates[key] = raw ? normalizeSocialHandle(raw).slice(0, 64) : ''
    }
  }

  if ('disabledBadges' in body) {
    if (!Array.isArray(body.disabledBadges)) {
      return NextResponse.json({ error: 'Invalid disabledBadges' }, { status: 400 })
    }
    const filtered = body.disabledBadges.filter(isBadgeKey)
    // Dedup + keep order stable via Set.
    updates.disabledBadges = Array.from(new Set(filtered))
  }

  if ('templateId' in body) {
    if (!isTemplateId(body.templateId)) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
    }
    updates.templateId = body.templateId
  }

  if ('theme' in body) {
    if (!isThemeId(body.theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }
    updates.theme = body.theme
  }

  if ('seasonalOverlay' in body) {
    if (!isSeasonalOverlayId(body.seasonalOverlay)) {
      return NextResponse.json({ error: 'Invalid seasonal overlay' }, { status: 400 })
    }
    updates.seasonalOverlay = body.seasonalOverlay
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await auth.api.updateOrganization({
    body: { organizationId: org.id, data: updates },
    headers: requestHeaders,
  })

  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Bust the RSC cache for every dashboard + public-menu route so changes
  // (colors, logo, QR style, currency) show up on next navigation without a
  // hard reload. `layout` scope invalidates every nested page under each root.
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/m/[slug]', 'page')

  return NextResponse.json({ ok: true })
}
