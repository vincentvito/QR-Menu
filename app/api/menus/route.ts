import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { createMenuFromSource } from '@/lib/menus/create'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'
import { canCreateMenu, hasCredits } from '@/lib/plans/gates'
import { spendCredits, InsufficientCreditsError } from '@/lib/plans/credits'
import { CREDIT_COSTS } from '@/lib/plans/costs'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
])
const MAX_TEXT_CHARS = 50_000

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const organization = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!organization) {
    return NextResponse.json({ error: 'Set up your restaurant first' }, { status: 409 })
  }

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(organization.id, activeRestaurantId)
  if (!restaurant) {
    return NextResponse.json({ error: 'No active restaurant' }, { status: 409 })
  }

  // Gate: plan menu limit and AI credit availability. Check both up front so
  // we don't burn an AI call on a request that's going to bounce anyway.
  const menuGate = await canCreateMenu(restaurant.id)
  if (!menuGate.allowed) {
    return NextResponse.json({ error: menuGate.reason, gate: 'menu-limit' }, { status: 403 })
  }
  const creditsOk = await hasCredits(organization.id, CREDIT_COSTS.MENU_EXTRACTION)
  if (!creditsOk) {
    return NextResponse.json(
      { error: 'Out of AI credits. Buy more or upgrade your plan.', gate: 'credits' },
      { status: 402 },
    )
  }

  const contentType = request.headers.get('content-type') ?? ''

  let url = ''
  let text = ''
  let name: string | undefined
  let file: { base64: string; mimeType: string } | undefined

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      url = String(form.get('url') ?? '').trim()
      text = String(form.get('text') ?? '').trim()
      const rawName = form.get('name')
      name = rawName ? String(rawName).trim() : undefined

      const rawFile = form.get('file')
      if (rawFile && rawFile instanceof File && rawFile.size > 0) {
        if (!ALLOWED_MIME.has(rawFile.type)) {
          return NextResponse.json(
            { error: `Unsupported file type: ${rawFile.type || 'unknown'}` },
            { status: 400 },
          )
        }
        const buf = Buffer.from(await rawFile.arrayBuffer())
        file = { base64: buf.toString('base64'), mimeType: rawFile.type }
      }
    } else {
      // JSON fallback (keeps the earlier URL/text flow working for clients that send JSON).
      const body = (await request.json()) as {
        url?: string
        text?: string
        name?: string
      }
      url = typeof body.url === 'string' ? body.url.trim() : ''
      text = typeof body.text === 'string' ? body.text.trim() : ''
      name = typeof body.name === 'string' ? body.name.trim() : undefined
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `Menu text is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).` },
      { status: 413 },
    )
  }

  if (!url && !text && !file) {
    return NextResponse.json(
      { error: 'Provide a URL, paste the menu text, or upload a file.' },
      { status: 400 },
    )
  }

  try {
    const menu = await createMenuFromSource({
      organizationId: organization.id,
      restaurantId: restaurant.id,
      url: url || undefined,
      text: text || undefined,
      file,
      name,
    })
    // Charge after success so a failed extraction doesn't cost a credit.
    // Race window between pre-check and spend is tolerable at this scale;
    // InsufficientCreditsError at this point only means a parallel action
    // drained the bucket — log it, don't fail a request that succeeded.
    try {
      await spendCredits(organization.id, CREDIT_COSTS.MENU_EXTRACTION, 'menu-extraction', {
        menuId: menu.id,
      })
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        console.warn('[api/menus] credit race — action succeeded but spend failed:', err.message)
      } else {
        throw err
      }
    }
    return NextResponse.json(menu, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('[api/menus] create failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
