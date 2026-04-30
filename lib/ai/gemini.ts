import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-3.1-flash-lite-preview'
let genAI: GoogleGenerativeAI | null = null

function getGenAI() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Gemini is not configured')
  }
  genAI ??= new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  return genAI
}

export type DietaryTag = 'V' | 'VG' | 'GF' | 'DF' | 'NF'

export interface ExtractedMenuItem {
  name: string
  category: string
  price: number
  description: string
  tags: DietaryTag[]
}

export interface ExtractedMenu {
  restaurantName: string
  items: ExtractedMenuItem[]
}

export interface ExtractedBrandFallback {
  name?: string
  description?: string
}

export interface DescriptionInput {
  name: string
  category?: string
  notes?: string
}

export type ExtractInput = { text: string } | { fileBase64: string; mimeType: string }

const BASE_PROMPT = `You are a menu data extraction assistant.

Extract:
1. The restaurant's name — short, proper-case (from title, header, or context)
2. Every dish or drink item on the menu

Return a JSON object with this exact shape:
{
  "restaurantName": "Restaurant Name",
  "items": [
    {
      "name": "exact dish name as written",
      "category": "section heading it belongs to (Starters, Mains, Desserts, Drinks, etc.)",
      "price": numeric price as a number (0 if not found),
      "description": "dish description if present, otherwise empty string",
      "tags": array of applicable dietary tags from ["V","VG","GF","DF","NF"] inferred from name/description
    }
  ]
}

Rules:
- Do not invent items or sections not present in the source
- Do not skip any item you can find
- If a section heading is unclear, use "Other"
- If no restaurant name is evident, use "Untitled Menu"
- Return ONLY the raw JSON object, no markdown fences, no commentary`

// Per-mode intro so Gemini knows whether to parse markdown, OCR an image, or read a PDF.
function instructionFor(input: ExtractInput): string {
  if ('text' in input) return '\n\nMenu content (markdown/text):\n\n' + input.text
  if (input.mimeType === 'application/pdf') return '\n\nExtract every item from this menu PDF.'
  return '\n\nExtract every item from this menu photo. Read all visible text.'
}

export async function extractMenu(input: ExtractInput): Promise<ExtractedMenu> {
  const model = getGenAI().getGenerativeModel({ model: MODEL })

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

  if ('fileBase64' in input) {
    parts.push({ inlineData: { data: input.fileBase64, mimeType: input.mimeType } })
    parts.push({ text: BASE_PROMPT + instructionFor(input) })
  } else {
    parts.push({ text: BASE_PROMPT + instructionFor(input) })
  }

  const result = await model.generateContent(parts)
  const raw = result.response.text().trim()

  // Tolerate accidental code fences, then pull the first {...} block out.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const jsonStr = cleaned.startsWith('{') ? cleaned : (cleaned.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!jsonStr) throw new Error('Gemini returned no JSON object')

  const parsed = JSON.parse(jsonStr) as {
    restaurantName?: unknown
    items?: unknown
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => {
          const obj = item as Record<string, unknown>
          return {
            name: String(obj.name ?? '').trim(),
            category: String(obj.category ?? 'Other').trim() || 'Other',
            price: typeof obj.price === 'number' ? obj.price : parseFloat(String(obj.price)) || 0,
            description: String(obj.description ?? '').trim(),
            tags: (Array.isArray(obj.tags) ? obj.tags : []).filter((t): t is DietaryTag =>
              ['V', 'VG', 'GF', 'DF', 'NF'].includes(String(t)),
            ),
          }
        })
        .filter((i) => i.name.length > 0)
    : []

  if (items.length === 0) throw new Error('No items found in that menu')

  return {
    restaurantName: String(parsed.restaurantName ?? 'Untitled Menu').trim() || 'Untitled Menu',
    items,
  }
}

export async function extractBrandingFallback(markdown: string): Promise<ExtractedBrandFallback> {
  const source = markdown.trim().slice(0, 12000)
  if (!source) return {}

  const model = getGenAI().getGenerativeModel({ model: MODEL })
  const result =
    await model.generateContent(`You are extracting restaurant branding from webpage text.

Return ONLY a raw JSON object with this exact shape:
{
  "name": "short restaurant name, or empty string if unknown",
  "description": "one sentence tagline/description, or empty string if unknown"
}

Rules:
- Use only evidence from the text.
- Prefer the restaurant's own name over page titles, delivery platform names, or SEO phrases.
- Keep description under 160 characters.
- Do not include markdown fences or commentary.

Webpage text:

${source}`)
  const raw = result.response.text().trim()
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const jsonStr = cleaned.startsWith('{') ? cleaned : (cleaned.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!jsonStr) return {}

  const parsed = JSON.parse(jsonStr) as { name?: unknown; description?: unknown }
  const name = String(parsed.name ?? '').trim()
  const description = String(parsed.description ?? '').trim()
  return {
    name: name || undefined,
    description: description || undefined,
  }
}

export async function generateMenuItemDescription({
  name,
  category,
  notes,
}: DescriptionInput): Promise<string> {
  const dishName = name.trim().slice(0, 160)
  if (!dishName) throw new Error('Dish name is required')

  const model = getGenAI().getGenerativeModel({ model: MODEL })
  const result =
    await model.generateContent(`You are helping a restaurant owner write concise menu copy.

Return ONLY one polished menu description. No markdown, no quotes, no price, no item name prefix.

Rules:
- One sentence
- 8 to 22 words
- Professional, appetizing, and specific
- Use only evidence from the dish name and owner notes
- Do not invent premium ingredients, allergens, cooking methods, origins, or dietary claims
- If notes are sparse, write a clean generic description without making risky claims

Dish name: ${dishName}
Category: ${category?.trim().slice(0, 80) || 'Menu'}
Owner notes: ${notes?.trim().slice(0, 500) || 'None'}`)

  return result.response
    .text()
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .slice(0, 240)
}
