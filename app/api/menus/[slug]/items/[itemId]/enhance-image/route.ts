import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { enhanceDishImage } from '@/lib/ai/dish-image'
import { keyForMenuItemImage, uploadBuffer } from '@/lib/storage/r2'
import { hasCredits } from '@/lib/plans/gates'
import { spendCredits, InsufficientCreditsError } from '@/lib/plans/credits'
import { CREDIT_COSTS } from '@/lib/plans/costs'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'
export const maxDuration = 90

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

const MAX_CONTEXT = 400

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'AI image enhancement is not configured' }, { status: 500 })
  }

  const { slug, itemId } = await params

  let body: { extraContext?: unknown } = {}
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

  let access
  try {
    access = await requireMenuAccess(slug, session.user.id)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    return NextResponse.json({ error: 'Not allowed' }, { status })
  }

  const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
  if (!writeGate.allowed) {
    return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
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
    return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
  }
  if (!item.imageUrl) {
    return NextResponse.json({ error: 'This dish has no photo to enhance yet' }, { status: 400 })
  }

  const creditsOk = await hasCredits(access.organizationId, CREDIT_COSTS.DISH_IMAGE_ENHANCE)
  if (!creditsOk) {
    return NextResponse.json(
      { error: 'Out of AI credits. Buy more or upgrade your plan.', gate: 'credits' },
      { status: 402 },
    )
  }

  try {
    // Download the current photo from R2 and base64-encode for Gemini.
    const sourceRes = await fetch(item.imageUrl)
    if (!sourceRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch source image (${sourceRes.status})` },
        { status: 502 },
      )
    }
    const sourceMimeType = sourceRes.headers.get('content-type') ?? 'image/jpeg'
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())
    const sourceBase64 = sourceBuffer.toString('base64')

    const image = await enhanceDishImage(sourceBase64, sourceMimeType, {
      name: item.name,
      category: item.category,
      description: item.description,
      extraContext,
    })

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
        CREDIT_COSTS.DISH_IMAGE_ENHANCE,
        'dish-image-enhance',
        { menuItemId: item.id },
      )
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        console.warn('[enhance-image] credit race — action succeeded, spend failed:', err.message)
      } else {
        throw err
      }
    }

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enhancement failed'
    console.error('[api/menus/[slug]/items/[itemId]/enhance-image] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
