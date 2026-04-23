import prisma from '@/lib/prisma'
import { scrapeUrl } from '@/lib/ai/firecrawl'
import { extractMenu, type ExtractedMenu } from '@/lib/ai/gemini'
import { makeSlug } from './slug'

interface CreateMenuInput {
  organizationId: string
  restaurantId: string
  url?: string
  text?: string
  file?: { base64: string; mimeType: string }
  name?: string
}

interface CreateMenuResult {
  id: string
  slug: string
  name: string
  itemCount: number
}

// Pick the source, run Firecrawl if URL → Gemini → save menu + items atomically.
// Menu name is explicit if provided; otherwise we fall back to Gemini's best
// guess (which Gemini returns under `restaurantName` — we reuse it as a label).
export async function createMenuFromSource({
  organizationId,
  restaurantId,
  url,
  text,
  file,
  name,
}: CreateMenuInput): Promise<CreateMenuResult> {
  const source = url?.trim()
  const pasted = text?.trim()

  if (!source && !pasted && !file) {
    throw new Error('Provide a URL, pasted text, or a file.')
  }

  let extracted: ExtractedMenu
  if (file) {
    extracted = await extractMenu({
      fileBase64: file.base64,
      mimeType: file.mimeType,
    })
  } else if (source) {
    const markdown = await scrapeUrl(source)
    extracted = await extractMenu({ text: markdown })
  } else {
    extracted = await extractMenu({ text: pasted! })
  }

  const finalName = name?.trim() || extracted.restaurantName || 'Menu'
  const slug = makeSlug(finalName)

  const menu = await prisma.menu.create({
    data: {
      slug,
      organizationId,
      restaurantId,
      name: finalName,
      sourceUrl: source || null,
      sourceText: !source && !file ? pasted : null,
      items: {
        create: extracted.items.map((item, i) => ({
          category: item.category,
          name: item.name,
          description: item.description,
          price: item.price,
          tags: item.tags,
          order: i,
        })),
      },
    },
    include: { _count: { select: { items: true } } },
  })

  return {
    id: menu.id,
    slug: menu.slug,
    name: menu.name,
    itemCount: menu._count.items,
  }
}
