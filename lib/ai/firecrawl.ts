// Scrape a URL to markdown via Firecrawl's main-content extractor.
// Returns trimmed markdown; throws if the page is empty or the API errors.
export async function scrapeUrl(url: string): Promise<string> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Firecrawl error ${res.status}`)
  }

  const { data } = await res.json()
  const markdown = data?.markdown ?? ''
  if (!markdown.trim()) throw new Error('No content found at that URL')
  return markdown
}

export interface ExtractedBranding {
  name?: string
  description?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
}

interface FirecrawlBrandingResponse {
  branding?: {
    colors?: Record<string, string>
    components?: {
      buttonPrimary?: Record<string, string>
      buttonSecondary?: Record<string, string>
    }
    images?: { logo?: string; ogImage?: string }
  }
  metadata?: {
    title?: string
    description?: string
    ogTitle?: string
    ogDescription?: string
  }
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function pickHex(...candidates: Array<string | undefined>): string | undefined {
  for (const c of candidates) {
    if (c && HEX_RE.test(c)) return c.toUpperCase()
  }
  return undefined
}

// Extract restaurant brand signals (name, description, logo, colors) from a URL.
// Best-effort: any field may be undefined. Throws only on API/network failure.
export async function scrapeBranding(url: string): Promise<ExtractedBranding> {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['branding'], onlyMainContent: false }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Firecrawl error ${res.status}`)
  }

  const { data } = (await res.json()) as { data?: FirecrawlBrandingResponse }
  const branding = data?.branding
  const meta = data?.metadata
  const colors = branding?.colors ?? {}

  const primaryColor = pickHex(
    colors.primary,
    branding?.components?.buttonPrimary?.background,
    colors.accent,
  )
  const secondaryColor = pickHex(
    colors.accent,
    branding?.components?.buttonSecondary?.borderColor,
    colors.link,
  )

  return {
    name: meta?.ogTitle || meta?.title || undefined,
    description: meta?.ogDescription || meta?.description || undefined,
    logo: branding?.images?.logo || branding?.images?.ogImage || undefined,
    primaryColor,
    secondaryColor,
  }
}
