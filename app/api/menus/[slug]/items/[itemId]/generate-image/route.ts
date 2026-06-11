import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateDishImage } from '@/lib/ai/dish-image'
import { buildGeneratePrompt } from '@/lib/ai/dish-image-prompts'
import { keyForMenuItemImage, uploadBuffer } from '@/lib/storage/r2'
import { hasCredits } from '@/lib/plans/gates'
import { spendCredits, InsufficientCreditsError } from '@/lib/plans/credits'
import { CREDIT_COSTS } from '@/lib/plans/costs'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant, getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { translatedApiError } from '@/lib/api/errors'

export const runtime = 'nodejs'
// Gemini image generation runs ~15–30s; give it headroom.
export const maxDuration = 90

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

const MAX_CONTEXT = 400

export async function POST(request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: t('menus.aiGenerateNotConfigured') }, { status: 500 })
  }

  const { slug, itemId } = await params

  let body: { extraContext?: unknown; overridePrompt?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine — extraContext is optional.
  }

  let extraContext: string | undefined
  if (typeof body.extraContext === 'string') {
    const trimmed = body.extraContext.trim().slice(0, MAX_CONTEXT)
    if (trimmed) extraContext = trimmed
  }

  // Admin-only escape hatch for prompt diagnostics. Silently ignored for
  // non-admins so a malicious client can't burn credits on adversarial
  // prompts. Cap length to keep token costs sane.
  const isAdmin = session.user.role === 'admin'
  let overridePrompt: string | undefined
  if (isAdmin && typeof body.overridePrompt === 'string') {
    const trimmed = body.overridePrompt.trim().slice(0, 20000)
    if (trimmed) overridePrompt = trimmed
  }

  // Access check (org member OR restaurant staff). Item query below is
  // scoped to the resolved menu id so staff can only touch their own venue.
  let access
  try {
    access = await requireMenuAccess(slug, session.user.id)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    return NextResponse.json({ error: t('common.notAllowed') }, { status })
  }

  const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
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

  const subscriptionAccess = await getSubscriptionAccessState(access.organizationId)
  if (!subscriptionAccess.hasActiveSubscription) {
    return NextResponse.json(
      { error: t('menus.startTrialForImages'), gate: 'setup' },
      { status: 402 },
    )
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, menuId: access.id },
    select: { id: true, name: true, category: true, description: true },
  })
  if (!item) {
    return NextResponse.json({ error: t('common.dishNotFound') }, { status: 404 })
  }

  const creditsOk = await hasCredits(access.organizationId, CREDIT_COSTS.DISH_IMAGE_GENERATE)
  if (!creditsOk) {
    return NextResponse.json({ error: t('menus.outOfCredits'), gate: 'credits' }, { status: 402 })
  }

  try {
    const prompt =
      overridePrompt ??
      buildGeneratePrompt({
        name: item.name,
        category: item.category,
        description: item.description,
        extraContext,
      })
    const image = await generateDishImage(prompt)

    const ext = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const stamp = randomBytes(4).toString('hex')
    const key = keyForMenuItemImage(access.organizationId, item.id, ext, stamp)
    const buffer = Buffer.from(image.base64, 'base64')
    const { url } = await uploadBuffer({
      key,
      body: buffer,
      contentType: image.mimeType,
    })

    try {
      await spendCredits(
        access.organizationId,
        CREDIT_COSTS.DISH_IMAGE_GENERATE,
        'dish-image-generate',
        { menuItemId: item.id },
      )
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        console.warn('[generate-image] credit race — action succeeded, spend failed:', err.message)
      } else {
        throw err
      }
    }

    return NextResponse.json({ url })
  } catch (err) {
    const message = translatedApiError(t, err, 'menus.generationFailed')
    console.error('[api/menus/[slug]/items/[itemId]/generate-image] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
