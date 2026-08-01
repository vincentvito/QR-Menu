import { NextResponse } from 'next/server'
import { analyticsReportBaseUrl, readAnalyticsReportEmailToken } from '@/lib/analytics/report-links'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

function resultUrl(status: 'unsubscribed' | 'invalid', restaurant?: string) {
  const url = new URL('/analytics-reports/email-preferences', analyticsReportBaseUrl())
  url.searchParams.set('status', status)
  if (restaurant) url.searchParams.set('restaurant', restaurant)
  return url
}

// POST-only by design. This URL is what the report's List-Unsubscribe header
// advertises (RFC 8058 one-click), and answering GET here would let link
// prefetchers opt recipients out without a human involved — the visible email
// link points at /analytics-reports/confirm instead.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const payload = readAnalyticsReportEmailToken(token, 'unsubscribe')

  // The confirmation page marks itself so a browser lands on a readable page,
  // while a mail provider's one-click POST gets a plain 200 with no redirect.
  const form = await request.formData().catch(() => null)
  const fromBrowser = form?.get('source') === 'web'

  if (!payload) {
    return fromBrowser
      ? NextResponse.redirect(resultUrl('invalid'), 303)
      : NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const recipient = await prisma.analyticsReportRecipient.findFirst({
    where: { id: payload.recipientId, restaurantId: payload.restaurantId },
    include: { restaurant: { select: { name: true } } },
  })
  if (!recipient) {
    return fromBrowser
      ? NextResponse.redirect(resultUrl('invalid'), 303)
      : NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    // Clearing `verifiedAt` is what makes the opt-out stick: re-adding this
    // address from the dashboard has to send a fresh confirmation rather than
    // silently resuming reports the recipient asked to stop.
    await tx.analyticsReportRecipient.update({
      where: { id: recipient.id },
      data: { disabledAt: recipient.disabledAt ?? new Date(), verifiedAt: null },
    })
    const remaining = await tx.analyticsReportRecipient.count({
      where: {
        restaurantId: recipient.restaurantId,
        id: { not: recipient.id },
        disabledAt: null,
        verifiedAt: { not: null },
      },
    })
    if (remaining === 0) {
      await tx.restaurant.update({
        where: { id: recipient.restaurantId },
        data: { analyticsReportFrequency: 'off' },
      })
    }
  })

  return fromBrowser
    ? NextResponse.redirect(resultUrl('unsubscribed', recipient.restaurant.name), 303)
    : NextResponse.json({ ok: true })
}
