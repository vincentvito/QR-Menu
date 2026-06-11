import { NextResponse, after } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { isBadgeKey } from '@/lib/menus/badges'
import { deleteByUrl } from '@/lib/storage/r2'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'
import { translatedApiError } from '@/lib/api/errors'
import type { DietaryTag } from '@/lib/ai/gemini'
import { minVariantPrice, parseVariants, type MenuItemVariant } from '@/lib/menus/variants'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

async function ensureOwnership(slug: string, itemId: string, userId: string) {
  const access = await requireMenuAccess(slug, userId)
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, menuId: true },
  })
  if (!item || item.menuId !== access.id) {
    const t = await getTranslations('Api')
    throw Object.assign(new Error(t('common.dishNotFound')), { status: 404 })
  }
  return {
    menuId: access.id,
    itemId: item.id,
    organizationId: access.organizationId,
    restaurantId: access.restaurantId,
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }
  const { slug, itemId } = await params

  let body: {
    name?: unknown
    description?: unknown
    price?: unknown
    variants?: unknown
    category?: unknown
    tags?: unknown
    badges?: unknown
    specialUntil?: unknown
    imageUrl?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  const updates: {
    name?: string
    description?: string
    price?: number
    variants?: MenuItemVariant[]
    category?: string
    tags?: string[]
    badges?: string[]
    specialUntil?: Date | null
    imageUrl?: string | null
  } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: t('menus.itemNameEmpty') }, { status: 400 })
    }
    updates.name = body.name.trim().slice(0, 200)
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      return NextResponse.json({ error: t('menus.descriptionInvalid') }, { status: 400 })
    }
    updates.description = body.description.slice(0, 1000)
  }
  if (body.price !== undefined) {
    const p = typeof body.price === 'number' ? body.price : parseFloat(String(body.price))
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: t('menus.priceInvalid') }, { status: 400 })
    }
    updates.price = Math.round(p * 100) / 100
  }
  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants)) {
      return NextResponse.json({ error: t('menus.variantsInvalid') }, { status: 400 })
    }
    // A lone variant is just a price; only 2+ entries count as a size list.
    const variants = parseVariants(body.variants)
    updates.variants = variants.length > 1 ? variants : []
    // Keep `price` (used for sorting/JSON-LD fallback) pinned to the
    // cheapest size whenever variants are present.
    if (updates.variants.length > 0) updates.price = minVariantPrice(updates.variants)
  }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !body.category.trim()) {
      return NextResponse.json({ error: t('menus.categoryEmpty') }, { status: 400 })
    }
    updates.category = body.category.trim().slice(0, 80)
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: t('menus.tagsInvalid') }, { status: 400 })
    }
    updates.tags = Array.from(
      new Set(
        body.tags.filter((tag): tag is DietaryTag =>
          ['V', 'VG', 'GF', 'DF', 'NF'].includes(String(tag)),
        ),
      ),
    )
  }
  if (body.badges !== undefined) {
    if (!Array.isArray(body.badges)) {
      return NextResponse.json({ error: t('menus.badgesInvalid') }, { status: 400 })
    }
    updates.badges = Array.from(new Set(body.badges.filter(isBadgeKey)))
  }
  if (body.imageUrl !== undefined) {
    if (body.imageUrl === null || body.imageUrl === '') {
      updates.imageUrl = null
    } else if (typeof body.imageUrl === 'string') {
      try {
        updates.imageUrl = new URL(body.imageUrl).toString()
      } catch {
        return NextResponse.json({ error: t('menus.imageUrlInvalid') }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: t('menus.imageUrlInvalid') }, { status: 400 })
    }
  }
  if (body.specialUntil !== undefined) {
    if (body.specialUntil === null) {
      updates.specialUntil = null
    } else if (typeof body.specialUntil === 'string') {
      const d = new Date(body.specialUntil)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: t('menus.specialUntilInvalid') }, { status: 400 })
      }
      updates.specialUntil = d
    } else {
      return NextResponse.json({ error: t('menus.specialUntilInvalid') }, { status: 400 })
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: t('common.noFieldsToUpdate') }, { status: 400 })
  }

  try {
    const ownership = await ensureOwnership(slug, itemId, session.user.id)
    const writeGate = await canWriteRestaurant(ownership.organizationId, ownership.restaurantId)
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

    const [prev, item] =
      'imageUrl' in updates
        ? await prisma.$transaction([
            prisma.menuItem.findUnique({
              where: { id: itemId },
              select: { imageUrl: true },
            }),
            prisma.menuItem.update({
              where: { id: itemId },
              data: updates,
            }),
          ])
        : ([
            null,
            await prisma.menuItem.update({
              where: { id: itemId },
              data: updates,
            }),
          ] as const)
    const previousImageUrl = prev?.imageUrl ?? null

    if (
      previousImageUrl &&
      previousImageUrl !== item.imageUrl &&
      item.imageUrl !== previousImageUrl
    ) {
      // Run after the response so the deletion doesn't delay the user's
      // save, but survives serverless handler suspension (vs plain `void`).
      after(() => deleteByUrl(previousImageUrl))
    }

    return NextResponse.json(item)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = translatedApiError(t, err, 'common.updateFailed')
    console.error('[api/menus/[slug]/items/[itemId]] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }
  const { slug, itemId } = await params

  try {
    const ownership = await ensureOwnership(slug, itemId, session.user.id)
    const writeGate = await canWriteRestaurant(ownership.organizationId, ownership.restaurantId)
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
    // Look up the image before deleting so we can clean up R2 afterwards.
    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId },
      select: { imageUrl: true },
    })
    await prisma.menuItem.delete({ where: { id: itemId } })
    if (existing?.imageUrl) {
      after(() => deleteByUrl(existing.imageUrl!))
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = translatedApiError(t, err, 'common.somethingWentWrong')
    console.error('[api/menus/[slug]/items/[itemId]] delete failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
