import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { createMenuFromSource } from '@/lib/menus/create'
import { DEFAULT_CURRENCY, isSupportedCurrency } from '@/lib/menus/currency'

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
// 20 MB: Gemini's hard limit for inline file data per request. Bigger files
// would need the Files API upload path — not worth the complexity yet.
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_TEXT_CHARS = 50_000

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''

  let url = ''
  let text = ''
  let restaurantName: string | undefined
  let currencyRaw: string | undefined
  let file: { base64: string; mimeType: string } | undefined

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      url = String(form.get('url') ?? '').trim()
      text = String(form.get('text') ?? '').trim()
      const rawName = form.get('restaurantName')
      restaurantName = rawName ? String(rawName).trim() : undefined
      const rawCurrency = form.get('currency')
      currencyRaw = rawCurrency ? String(rawCurrency) : undefined

      const rawFile = form.get('file')
      if (rawFile && rawFile instanceof File && rawFile.size > 0) {
        if (!ALLOWED_MIME.has(rawFile.type)) {
          return NextResponse.json(
            { error: `Unsupported file type: ${rawFile.type || 'unknown'}` },
            { status: 400 },
          )
        }
        if (rawFile.size > MAX_FILE_BYTES) {
          return NextResponse.json(
            { error: 'File is larger than 20 MB — try a smaller photo or PDF.' },
            { status: 413 },
          )
        }
        const buf = Buffer.from(await rawFile.arrayBuffer())
        file = { base64: buf.toString('base64'), mimeType: rawFile.type }
      }
    } else {
      // JSON fallback (keeps the earlier URL/text flow working for clients that send JSON).
      const body = (await request.json()) as {
        url?: string
        text?: string
        restaurantName?: string
      }
      url = typeof body.url === 'string' ? body.url.trim() : ''
      text = typeof body.text === 'string' ? body.text.trim() : ''
      restaurantName =
        typeof body.restaurantName === 'string' ? body.restaurantName.trim() : undefined
      currencyRaw = typeof (body as { currency?: unknown }).currency === 'string'
        ? ((body as { currency: string }).currency)
        : undefined
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `Menu text is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).` },
      { status: 413 },
    )
  }

  if (!url && !text && !file) {
    return NextResponse.json(
      { error: 'Provide a URL, paste the menu text, or upload a file.' },
      { status: 400 },
    )
  }

  // Default to USD if missing; reject unknown codes rather than silently casting.
  const currency = currencyRaw
    ? isSupportedCurrency(currencyRaw)
      ? currencyRaw
      : null
    : DEFAULT_CURRENCY
  if (currency === null) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currencyRaw}` },
      { status: 400 },
    )
  }

  try {
    const menu = await createMenuFromSource({
      userId: session.user.id,
      url: url || undefined,
      text: text || undefined,
      file,
      restaurantName,
      currency,
    })
    return NextResponse.json(menu, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    console.error('[api/menus] create failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
