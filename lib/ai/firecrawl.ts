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
