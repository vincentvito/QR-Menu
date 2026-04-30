import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { extractMenu, type DietaryTag, type ExtractedMenuItem } from '@/lib/ai/gemini'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

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

interface RouteContext {
  params: Promise<{ slug: string }>
}

type ImportItem = Pick<ExtractedMenuItem, 'name' | 'category' | 'description' | 'price' | 'tags'>

function cleanCategory(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : ''
}

function cleanImportItem(value: unknown): ImportItem | null {
  const obj = value as Record<string, unknown>
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 200) : ''
  const category = cleanCategory(obj.category) || 'Other'
  if (!name) return null

  const rawPrice = typeof obj.price === 'number' ? obj.price : parseFloat(String(obj.price ?? 0))
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice * 100) / 100 : 0
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((tag): tag is DietaryTag =>
        ['V', 'VG', 'GF', 'DF', 'NF'].includes(String(tag)),
      )
    : []

  return {
    name,
    category,
    price,
    description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 1000) : '',
    tags,
  }
}

async function requireWritableMenu(slug: string, userId: string) {
  const access = await requireMenuAccess(slug, userId)
  const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
  if (!writeGate.allowed) {
    throw Object.assign(new Error(writeGate.reason), { status: 402, gate: writeGate.gate })
  }
  return access
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { slug } = await params
  const contentType = request.headers.get('content-type') ?? ''

  try {
    const access = await requireWritableMenu(slug, session.user.id)

    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      const targetCategory = cleanCategory(form.get('category'))
      const text = String(form.get('text') ?? '').trim()
      const rawFile = form.get('file')

      if (text.length > MAX_TEXT_CHARS) {
        return NextResponse.json(
          { error: `Menu text is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).` },
          { status: 413 },
        )
      }

      let extracted
      if (rawFile && rawFile instanceof File && rawFile.size > 0) {
        if (!ALLOWED_MIME.has(rawFile.type)) {
          return NextResponse.json(
            { error: `Unsupported file type: ${rawFile.type || 'unknown'}` },
            { status: 400 },
          )
        }
        const buffer = Buffer.from(await rawFile.arrayBuffer())
        extracted = await extractMenu({
          fileBase64: buffer.toString('base64'),
          mimeType: rawFile.type,
        })
      } else if (text) {
        extracted = await extractMenu({ text })
      } else {
        return NextResponse.json({ error: 'Upload a file or paste menu text.' }, { status: 400 })
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
      return NextResponse.json({ error: 'No items to add' }, { status: 400 })
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
            tags: item.tags,
            order: startOrder + index,
          },
        }),
      ),
    )

    return NextResponse.json({ items: created }, { status: 201 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Import failed'
    const gate = (err as { gate?: string })?.gate
    console.error('[api/menus/[slug]/imports] post failed:', err)
    return NextResponse.json({ error: message, gate }, { status })
  }
}
