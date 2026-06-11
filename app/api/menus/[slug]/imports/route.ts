import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { extractMenu, type DietaryTag, type ExtractedMenuItem } from '@/lib/ai/gemini'
import { minVariantPrice, parseVariants } from '@/lib/menus/variants'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'
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

interface RouteContext {
  params: Promise<{ slug: string }>
}

type ImportItem = Pick<
  ExtractedMenuItem,
  'name' | 'category' | 'description' | 'price' | 'variants' | 'tags'
>

function cleanCategory(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : ''
}

function cleanImportItem(value: unknown): ImportItem | null {
  const obj = value as Record<string, unknown>
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 200) : ''
  const category = cleanCategory(obj.category) || 'Other'
  if (!name) return null

  const variants = parseVariants(obj.variants)
  const rawPrice = typeof obj.price === 'number' ? obj.price : parseFloat(String(obj.price ?? 0))
  const price =
    variants.length > 1
      ? minVariantPrice(variants)
      : Number.isFinite(rawPrice) && rawPrice > 0
        ? Math.round(rawPrice * 100) / 100
        : 0
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((tag): tag is DietaryTag =>
        ['V', 'VG', 'GF', 'DF', 'NF'].includes(String(tag)),
      )
    : []

  return {
    name,
    category,
    price,
    variants: variants.length > 1 ? variants : [],
    description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 1000) : '',
    tags,
  }
}

async function requireWritableMenu(slug: string, userId: string) {
  const access = await requireMenuAccess(slug, userId)
  const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
  if (!writeGate.allowed) {
    const t = await getTranslations('Api')
    throw Object.assign(
      new Error(
        writeGate.reason
          ? t(writeGate.reason.key, writeGate.reason.params)
          : t('gates.subscriptionLapsed'),
      ),
      { status: 402, gate: writeGate.gate },
    )
  }
  return access
}

export async function POST(request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  const { slug } = await params
  const contentType = request.headers.get('content-type') ?? ''

  try {
    const access = await requireWritableMenu(slug, session.user.id)

    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      const targetCategory = cleanCategory(form.get('category'))
      const text = String(form.get('text') ?? '').trim()
      const rawFiles = form
        .getAll('file')
        .filter((value): value is File => value instanceof File && value.size > 0)

      if (text.length > MAX_TEXT_CHARS) {
        return NextResponse.json(
          { error: t('menus.textTooLong', { limit: MAX_TEXT_CHARS }) },
          { status: 413 },
        )
      }

      let extracted
      if (rawFiles.length > 0) {
        if (rawFiles.length > MAX_FILES) {
          return NextResponse.json(
            { error: t('menus.tooManyFiles', { limit: MAX_FILES }) },
            { status: 400 },
          )
        }

        const badFile = rawFiles.find((rawFile) => !ALLOWED_MIME.has(rawFile.type))
        if (badFile) {
          return NextResponse.json(
            { error: t('common.unsupportedFileType', { type: badFile.type || 'unknown' }) },
            { status: 400 },
          )
        }

        const extractedFiles = await Promise.all(
          rawFiles.map(async (rawFile) => {
            const buffer = Buffer.from(await rawFile.arrayBuffer())
            return extractMenu({
              fileBase64: buffer.toString('base64'),
              mimeType: rawFile.type,
            })
          }),
        )
        extracted = { items: extractedFiles.flatMap((menu) => menu.items) }
      } else if (text) {
        extracted = await extractMenu({ text })
      } else {
        return NextResponse.json({ error: t('menus.uploadOrPaste') }, { status: 400 })
      }

      const items = extracted.items.map((item) => ({
        ...item,
        category: targetCategory || item.category,
      }))
      return NextResponse.json({ items })
    }

    const body = (await request.json()) as { items?: unknown }
    const items = Array.isArray(body.items)
      ? body.items.map(cleanImportItem).filter((item): item is ImportItem => Boolean(item))
      : []

    if (items.length === 0) {
      return NextResponse.json({ error: t('menus.noItemsToAdd') }, { status: 400 })
    }

    const last = await prisma.menuItem.findFirst({
      where: { menuId: access.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const startOrder = (last?.order ?? -1) + 1

    const created = await prisma.$transaction(
      items.map((item, index) =>
        prisma.menuItem.create({
          data: {
            menuId: access.id,
            category: item.category,
            name: item.name,
            description: item.description,
            price: item.price,
            variants: item.variants,
            tags: item.tags,
            order: startOrder + index,
          },
        }),
      ),
    )

    return NextResponse.json({ items: created }, { status: 201 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = translatedApiError(t, err, 'menus.extractionFailed')
    const gate = (err as { gate?: string })?.gate
    console.error('[api/menus/[slug]/imports] post failed:', err)
    return NextResponse.json({ error: message, gate }, { status })
  }
}
