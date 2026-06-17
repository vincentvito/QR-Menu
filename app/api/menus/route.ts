import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { createMenuFromSource } from '@/lib/menus/create'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { getActiveRestaurant } from '@/lib/restaurants/get-active-restaurant'
import { canCreateMenu } from '@/lib/plans/gates'
import { translatedApiError } from '@/lib/api/errors'

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
const MAX_FILES = 3

export async function POST(request: Request) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  const organization = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!organization) {
    return NextResponse.json({ error: t('menus.setUpFirst') }, { status: 409 })
  }

  const activeRestaurantId = (session.session as { activeRestaurantId?: string | null })
    .activeRestaurantId
  const restaurant = await getActiveRestaurant(organization.id, activeRestaurantId)
  if (!restaurant) {
    return NextResponse.json({ error: t('common.noActiveRestaurant') }, { status: 409 })
  }

  // Gate: plan menu limit. Extraction itself is free — credits are reserved
  // for per-dish image work.
  const menuGate = await canCreateMenu(restaurant.id)
  if (!menuGate.allowed) {
    return NextResponse.json(
      {
        error: menuGate.reason
          ? t(menuGate.reason.key, menuGate.reason.params)
          : t('gates.subscriptionLapsed'),
        gate: 'menu-limit',
      },
      { status: 403 },
    )
  }

  const contentType = request.headers.get('content-type') ?? ''

  let url = ''
  let text = ''
  let name: string | undefined
  const files: { base64: string; mimeType: string }[] = []

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      url = String(form.get('url') ?? '').trim()
      text = String(form.get('text') ?? '').trim()
      const rawName = form.get('name')
      name = rawName ? String(rawName).trim() : undefined

      const rawFiles = form
        .getAll('file')
        .filter((value): value is File => value instanceof File && value.size > 0)

      if (rawFiles.length > MAX_FILES) {
        return NextResponse.json(
          { error: t('menus.tooManyFiles', { limit: MAX_FILES }) },
          { status: 400 },
        )
      }

      for (const rawFile of rawFiles) {
        if (!ALLOWED_MIME.has(rawFile.type)) {
          return NextResponse.json(
            { error: t('common.unsupportedFileType', { type: rawFile.type || 'unknown' }) },
            { status: 400 },
          )
        }
        const buf = Buffer.from(await rawFile.arrayBuffer())
        files.push({ base64: buf.toString('base64'), mimeType: rawFile.type })
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
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: t('menus.textTooLong', { limit: MAX_TEXT_CHARS }) },
      { status: 413 },
    )
  }

  if (!url && !text && files.length === 0) {
    return NextResponse.json({ error: t('menus.provideSource') }, { status: 400 })
  }

  try {
    const menu = await createMenuFromSource({
      organizationId: organization.id,
      restaurantId: restaurant.id,
      url: url || undefined,
      text: text || undefined,
      files,
      name,
    })
    return NextResponse.json(menu, { status: 201 })
  } catch (err) {
    const message = translatedApiError(t, err, 'menus.extractionFailed')
    console.error('[api/menus] create failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
