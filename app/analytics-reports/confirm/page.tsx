import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { readAnalyticsReportEmailToken } from '@/lib/analytics/report-links'
import prisma from '@/lib/prisma'
import { AnalyticsReportResultCard, AnalyticsReportStatusCard } from '../_components/status-card'

interface PageProps {
  searchParams: Promise<{ action?: string; token?: string }>
}

const ENDPOINTS = {
  verify: '/api/analytics-reports/recipients/verify',
  unsubscribe: '/api/analytics-reports/unsubscribe',
} as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AnalyticsReportEmailPreferences')
  return { title: t('metadataTitle'), robots: { index: false, follow: false } }
}

// Mail clients and corporate security scanners follow links in messages before
// a human ever clicks, so neither confirming a recipient nor stopping reports
// can happen on a GET. This page shows what is about to happen and POSTs it.
export default async function AnalyticsReportConfirmPage({ searchParams }: PageProps) {
  const t = await getTranslations('AnalyticsReportEmailPreferences')
  const { action, token } = await searchParams
  const validAction = action === 'verify' || action === 'unsubscribe' ? action : null
  const payload = validAction && token ? readAnalyticsReportEmailToken(token, validAction) : null

  const recipient = payload
    ? await prisma.analyticsReportRecipient.findFirst({
        where: { id: payload.recipientId, restaurantId: payload.restaurantId },
        select: {
          email: true,
          verifiedAt: true,
          disabledAt: true,
          restaurant: { select: { name: true } },
        },
      })
    : null

  if (!validAction || !token || !recipient) {
    return <AnalyticsReportResultCard status="invalid" />
  }

  // Nothing left to confirm — show the outcome the recipient came here for.
  if (validAction === 'unsubscribe' && recipient.disabledAt) {
    return (
      <AnalyticsReportResultCard status="unsubscribed" restaurant={recipient.restaurant.name} />
    )
  }
  if (validAction === 'verify' && (recipient.disabledAt || recipient.verifiedAt)) {
    return recipient.disabledAt ? (
      <AnalyticsReportResultCard status="invalid" />
    ) : (
      <AnalyticsReportResultCard status="verified" restaurant={recipient.restaurant.name} />
    )
  }

  return (
    <AnalyticsReportStatusCard
      tone="prompt"
      title={t(`confirm.${validAction}.title`)}
      body={t(`confirm.${validAction}.body`, {
        email: recipient.email,
        restaurant: recipient.restaurant.name,
      })}
      homeAria={t('homeAria')}
    >
      <form action={`${ENDPOINTS[validAction]}?token=${encodeURIComponent(token)}`} method="post">
        <input type="hidden" name="source" value="web" />
        <Button type="submit" className="w-full">
          {t(`confirm.${validAction}.action`)}
        </Button>
      </form>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/">{t('confirm.cancel')}</Link>
      </Button>
    </AnalyticsReportStatusCard>
  )
}
