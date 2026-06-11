import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'
import { translatedApiError } from '@/lib/api/errors'
import type { DietaryTag } from '@/lib/ai/gemini'
import { minVariantPrice, parseVariants } from '@/lib/menus/variants'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }
  const { slug } = await params

  let body: {
    category?: unknown
    name?: unknown
    description?: unknown
    price?: unknown
    variants?: unknown
    tags?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category.trim() : ''
  if (!category) {
    return NextResponse.json({ error: t('menus.categoryRequired') }, { status: 400 })
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New dish'
  const description = typeof body.description === 'string' ? body.description.slice(0, 1000) : ''
  let price = 0
  if (body.price !== undefined) {
    const p = typeof body.price === 'number' ? body.price : parseFloat(String(body.price))
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: t('menus.priceInvalid') }, { status: 400 })
    }
    price = Math.round(p * 100) / 100
  }
  // A lone variant is just a price; keep the variants list meaningful (2+).
  const variants = parseVariants(body.variants)
  const effectiveVariants = variants.length > 1 ? variants : []
  if (effectiveVariants.length > 0) price = minVariantPrice(effectiveVariants)
  const tags = Array.isArray(body.tags)
    ? Array.from(
        new Set(
          body.tags.filter((tag): tag is DietaryTag =>
            ['V', 'VG', 'GF', 'DF', 'NF'].includes(String(tag)),
          ),
        ),
      )
    : []

  try {
    const access = await requireMenuAccess(slug, session.user.id)
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
    // New items go to the end of the full menu so they don't disrupt
    // existing ordering inside their category until the user reorders.
    const last = await prisma.menuItem.findFirst({
      where: { menuId: access.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const item = await prisma.menuItem.create({
      data: {
        menuId: access.id,
        category: category.slice(0, 80),
        name: name.slice(0, 200),
        description,
        price,
        variants: effectiveVariants,
        tags,
        order: (last?.order ?? -1) + 1,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = translatedApiError(t, err, 'common.somethingWentWrong')
    console.error('[api/menus/[slug]/items] create failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
