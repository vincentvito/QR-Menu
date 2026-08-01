import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export type AnalyticsReportEmailAction = 'verify' | 'unsubscribe'

interface AnalyticsReportEmailActionPayload {
  version: 1
  action: AnalyticsReportEmailAction
  recipientId: string
  restaurantId: string
  expiresAt?: number
}

function signingSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required for analytics report links')
  return secret
}

function signature(value: string) {
  return createHmac('sha256', signingSecret()).update(value).digest('base64url')
}

export function createAnalyticsReportEmailToken(
  action: AnalyticsReportEmailAction,
  recipientId: string,
  restaurantId: string,
  expiresAt?: Date,
) {
  const payload: AnalyticsReportEmailActionPayload = {
    version: 1,
    action,
    recipientId,
    restaurantId,
    ...(expiresAt ? { expiresAt: expiresAt.getTime() } : {}),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

export function readAnalyticsReportEmailToken(
  token: string | null,
  expectedAction: AnalyticsReportEmailAction,
): AnalyticsReportEmailActionPayload | null {
  if (!token || token.length > 2048) return null
  const [encoded, suppliedSignature, ...rest] = token.split('.')
  if (!encoded || !suppliedSignature || rest.length > 0) return null

  const expectedSignature = signature(encoded)
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as AnalyticsReportEmailActionPayload
    if (
      payload.version !== 1 ||
      payload.action !== expectedAction ||
      typeof payload.recipientId !== 'string' ||
      typeof payload.restaurantId !== 'string' ||
      (payload.expiresAt !== undefined && payload.expiresAt < Date.now())
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function analyticsReportBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3001'
  ).replace(/\/$/, '')
}

// Links placed in email bodies land on a confirmation page, never on an
// endpoint that mutates state, because mail clients prefetch them.
export function analyticsReportConfirmUrl(action: AnalyticsReportEmailAction, token: string) {
  const url = new URL('/analytics-reports/confirm', analyticsReportBaseUrl())
  url.searchParams.set('action', action)
  url.searchParams.set('token', token)
  return url.toString()
}

// Target for the List-Unsubscribe header — POST-only, so one-click opt-out
// works without exposing a prefetchable GET.
export function analyticsReportOneClickUnsubscribeUrl(token: string) {
  const url = new URL('/api/analytics-reports/unsubscribe', analyticsReportBaseUrl())
  url.searchParams.set('token', token)
  return url.toString()
}
