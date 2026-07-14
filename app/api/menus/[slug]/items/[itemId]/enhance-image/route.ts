import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { enhanceDishImage } from '@/lib/ai/dish-image'
import { buildEnhancePrompt } from '@/lib/ai/dish-image-prompts'
import { keyForMenuItemImage, uploadBuffer } from '@/lib/storage/r2'
import {
  spendCredits,
  refundCreditSpend,
  InsufficientCreditsError,
  type SpendResult,
} from '@/lib/plans/credits'
import { CREDIT_COSTS } from '@/lib/plans/costs'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant, getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { translatedApiError } from '@/lib/api/errors'

export const runtime = 'nodejs'
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
    return NextResponse.json({ error: t('menus.aiEnhanceNotConfigured') }, { status: 500 })
  }

  const { slug, itemId } = await params

  let body: { extraContext?: unknown; overridePrompt?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine.
  }

  let extraContext: string | undefined
  if (typeof body.extraContext === 'string') {
    const trimmed = body.extraContext.trim().slice(0, MAX_CONTEXT)
    if (trimmed) extraContext = trimmed
  }

  // Admin-only escape hatch — see the matching block in generate-image.
  const isAdmin = session.user.role === 'admin'
  let overridePrompt: string | undefined
  if (isAdmin && typeof body.overridePrompt === 'string') {
    const trimmed = body.overridePrompt.trim().slice(0, 20000)
    if (trimmed) overridePrompt = trimmed
  }

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
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      imageUrl: true,
    },
  })
  if (!item) {
    return NextResponse.json({ error: t('common.dishNotFound') }, { status: 404 })
  }
  if (!item.imageUrl) {
    return NextResponse.json({ error: t('menus.noPhotoToEnhance') }, { status: 400 })
  }

  let reservation: SpendResult | undefined
  try {
    // Download the current photo from R2 and base64-encode for Gemini.
    const sourceRes = await fetch(item.imageUrl)
    if (!sourceRes.ok) {
      return NextResponse.json(
        { error: t('menus.sourceImageFetchFailed', { status: sourceRes.status }) },
        { status: 502 },
      )
    }
    const sourceMimeType = sourceRes.headers.get('content-type') ?? 'image/jpeg'
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())
    const sourceBase64 = sourceBuffer.toString('base64')

    try {
      reservation = await spendCredits(
        access.organizationId,
        CREDIT_COSTS.DISH_IMAGE_ENHANCE,
        'dish-image-enhance-reserved',
        { menuItemId: item.id },
      )
    } catch (err) {
      if (!(err instanceof InsufficientCreditsError)) throw err
      return NextResponse.json({ error: t('menus.outOfCredits'), gate: 'credits' }, { status: 402 })
    }

    const prompt =
      overridePrompt ??
      buildEnhancePrompt({
        name: item.name,
        category: item.category,
        description: item.description,
        extraContext,
      })
    const image = await enhanceDishImage(sourceBase64, sourceMimeType, prompt)

    const ext = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const stamp = randomBytes(4).toString('hex')
    const key = keyForMenuItemImage(access.organizationId, item.id, ext, stamp)
    const buffer = Buffer.from(image.base64, 'base64')
    const { url } = await uploadBuffer({
      key,
      body: buffer,
      contentType: image.mimeType,
    })

    return NextResponse.json({ url })
  } catch (err) {
    if (reservation) {
      try {
        await refundCreditSpend(access.organizationId, reservation, 'dish-image-enhance-failed', {
          menuItemId: item.id,
        })
      } catch (refundError) {
        console.error('[enhance-image] failed to refund reserved credit:', refundError)
      }
    }
    const message = translatedApiError(t, err, 'menus.enhancementFailed')
    console.error('[api/menus/[slug]/items/[itemId]/enhance-image] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
