import prisma from '@/lib/prisma'
import { scrapeUrl } from '@/lib/ai/firecrawl'
import { extractMenu, type ExtractedMenu } from '@/lib/ai/gemini'
import { DEFAULT_CURRENCY, type CurrencyCode } from './currency'
import { makeSlug } from './slug'

interface CreateMenuInput {
  userId: string
  url?: string
  text?: string
  file?: { base64: string; mimeType: string }
  restaurantName?: string
  currency?: CurrencyCode
}

interface CreateMenuResult {
  id: string
  slug: string
  restaurantName: string
  itemCount: number
}

// Pick the source, run Firecrawl if URL → Gemini → save menu + items atomically.
export async function createMenuFromSource({
  userId,
  url,
  text,
  file,
  restaurantName,
  currency = DEFAULT_CURRENCY,
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

  const finalName = restaurantName?.trim() || extracted.restaurantName
  const slug = makeSlug(finalName)

  const menu = await prisma.menu.create({
    data: {
      slug,
      userId,
      restaurantName: finalName,
      currency,
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
    restaurantName: menu.restaurantName,
    itemCount: menu._count.items,
  }
}
