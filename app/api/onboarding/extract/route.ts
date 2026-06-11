import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { scrapeBranding } from '@/lib/ai/firecrawl'
import { getTranslations } from 'next-intl/server'
import { translatedApiError } from '@/lib/api/errors'

export const runtime = 'nodejs'
export const maxDuration = 60

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    return u.toString()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  if (typeof body.url !== 'string') {
    return NextResponse.json({ error: t('onboarding.urlRequired') }, { status: 400 })
  }

  const normalized = normalizeUrl(body.url)
  if (!normalized) {
    return NextResponse.json({ error: t('onboarding.invalidUrl') }, { status: 400 })
  }

  try {
    const branding = await scrapeBranding(normalized)
    return NextResponse.json({ url: normalized, ...branding })
  } catch (err) {
    const message = translatedApiError(t, err, 'onboarding.extractFailed')
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
