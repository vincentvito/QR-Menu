import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateDishImage } from '@/lib/ai/dish-image'
import { keyForMenuItemImage, uploadBuffer } from '@/lib/storage/r2'
import { hasCredits } from '@/lib/plans/gates'
import { spendCredits, InsufficientCreditsError } from '@/lib/plans/credits'
import { CREDIT_COSTS } from '@/lib/plans/costs'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'
// Gemini image generation runs ~15–30s; give it headroom.
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
    return NextResponse.json({ error: 'AI image generation is not configured' }, { status: 500 })
  }

  const { slug, itemId } = await params

  let body: { extraContext?: unknown } = {}
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

  // Access check (org member OR restaurant staff). Item query below is
  // scoped to the resolved menu id so staff can only touch their own venue.
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
    select: { id: true, name: true, category: true, description: true },
  })
  if (!item) {
    return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
  }

  const creditsOk = await hasCredits(access.organizationId, CREDIT_COSTS.DISH_IMAGE_GENERATE)
  if (!creditsOk) {
    return NextResponse.json(
      { error: 'Out of AI credits. Buy more or upgrade your plan.', gate: 'credits' },
      { status: 402 },
    )
  }

  try {
    const image = await generateDishImage({
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
    const message = err instanceof Error ? err.message : 'Generation failed'
    console.error('[api/menus/[slug]/items/[itemId]/generate-image] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
