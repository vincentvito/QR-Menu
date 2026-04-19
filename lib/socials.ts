export type SocialProvider = 'instagram' | 'tiktok' | 'facebook'

const BASE: Record<SocialProvider, string> = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  facebook: 'https://facebook.com/',
}

// Accept a raw owner input — a bare handle, an @handle, or a pasted URL —
// and return just the handle (no leading @, no slashes). Stored in the DB
// this way so the settings form shows what the owner typed and render
// constructs the canonical URL.
export function normalizeSocialHandle(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  let value = trimmed
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      value = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
    } catch {
      // Not a parseable URL — fall through and treat the input as a handle.
    }
  }
  return value.replace(/^@/, '')
}

export function socialUrl(provider: SocialProvider, value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  // Back-compat: older rows were stored as full URLs. If the value already
  // looks like one, pass it through instead of double-prefixing.
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const clean = trimmed.replace(/^@/, '')
  if (!clean) return null
  return BASE[provider] + clean
}
