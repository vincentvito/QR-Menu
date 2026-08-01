import { NextResponse } from 'next/server'
import { analyticsReportBaseUrl, readAnalyticsReportEmailToken } from '@/lib/analytics/report-links'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

function resultUrl(status: 'verified' | 'invalid', restaurant?: string) {
  const url = new URL('/analytics-reports/email-preferences', analyticsReportBaseUrl())
  url.searchParams.set('status', status)
  if (restaurant) url.searchParams.set('restaurant', restaurant)
  return url
}

// POST-only so a scanner prefetching the link in the confirmation email can't
// opt an address in on the recipient's behalf. The email links to
// /analytics-reports/confirm, which posts here.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const payload = readAnalyticsReportEmailToken(token, 'verify')
  if (!payload) return NextResponse.redirect(resultUrl('invalid'), 303)

  const recipient = await prisma.analyticsReportRecipient.findFirst({
    where: {
      id: payload.recipientId,
      restaurantId: payload.restaurantId,
      disabledAt: null,
    },
    include: { restaurant: { select: { name: true } } },
  })
  if (!recipient) return NextResponse.redirect(resultUrl('invalid'), 303)

  if (!recipient.verifiedAt) {
    await prisma.analyticsReportRecipient.update({
      where: { id: recipient.id },
      data: { verifiedAt: new Date() },
    })
  }
  return NextResponse.redirect(resultUrl('verified', recipient.restaurant.name), 303)
}
