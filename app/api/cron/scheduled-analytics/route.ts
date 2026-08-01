import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/locales'
import { defaultLocale, isLocale } from '@/i18n/locales'
import {
  analyticsReportBaseUrl,
  analyticsReportConfirmUrl,
  analyticsReportOneClickUnsubscribeUrl,
  createAnalyticsReportEmailToken,
} from '@/lib/analytics/report-links'
import {
  formatAnalyticsReportDateRange,
  getAnalyticsReportRun,
  isAnalyticsReportFrequency,
} from '@/lib/analytics/report-schedule'
import { getScheduledAnalyticsReport } from '@/lib/analytics/scheduled-report'
import { sendEmail } from '@/lib/email'
import {
  scheduledAnalyticsEmailTemplate,
  type ScheduledAnalyticsEmailCopy,
} from '@/lib/email-templates'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 300

// Restaurants are cheap to prepare (one aggregate query each); individual sends
// go through a much smaller window so a busy period can't burst hundreds of
// concurrent requests at the mail provider.
const RESTAURANT_CONCURRENCY = 8
const SEND_CONCURRENCY = 4

type DeliveryStatus = 'sent' | 'skipped' | 'failed'

interface Delivery {
  restaurantId: string
  recipient: { id: string; email: string; lastSentKey: string | null; lastSentAt: Date | null }
  periodKey: string
  subject: string
  htmlFor: (unsubscribeUrl: string) => string
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await run(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

async function emailCopy(locale: Locale): Promise<ScheduledAnalyticsEmailCopy> {
  const t = await getTranslations({ locale, namespace: 'Email' })
  return {
    tagline: t('common.tagline'),
    subject: ({ restaurantName }) => t('scheduledAnalytics.subject', { restaurantName }),
    intro: ({ restaurantName, dateRange }) =>
      t('scheduledAnalytics.intro', { restaurantName, dateRange }),
    scans: t('scheduledAnalytics.metrics.scans'),
    uniqueGuests: t('scheduledAnalytics.metrics.uniqueGuests'),
    reviewClicks: t('scheduledAnalytics.metrics.reviewClicks'),
    wifiReveals: t('scheduledAnalytics.metrics.wifiReveals'),
    noActivity: t('scheduledAnalytics.noActivity'),
    openAnalytics: t('scheduledAnalytics.openAnalytics'),
    managePreferences: t('scheduledAnalytics.managePreferences'),
    unsubscribe: t('scheduledAnalytics.unsubscribe'),
    footer: t('scheduledAnalytics.footer'),
  }
}

async function deliver({
  restaurantId,
  recipient,
  periodKey,
  subject,
  htmlFor,
}: Delivery): Promise<DeliveryStatus> {
  const claimedAt = new Date()
  const claim = await prisma.analyticsReportRecipient.updateMany({
    where: {
      id: recipient.id,
      restaurantId,
      disabledAt: null,
      verifiedAt: { not: null },
      OR: [{ lastSentKey: null }, { lastSentKey: { not: periodKey } }],
    },
    data: { lastSentKey: periodKey, lastSentAt: claimedAt },
  })
  if (claim.count === 0) return 'skipped'

  try {
    const token = createAnalyticsReportEmailToken('unsubscribe', recipient.id, restaurantId)
    const result = await sendEmail({
      to: recipient.email,
      subject,
      html: htmlFor(analyticsReportConfirmUrl('unsubscribe', token)),
      headers: {
        'List-Unsubscribe': `<${analyticsReportOneClickUnsubscribeUrl(token)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    // A logged-but-unsent email would otherwise mark the period as delivered
    // and permanently skip it, so missing credentials have to fail loudly.
    if (result.skipped) throw new Error('Email delivery is not configured')
    if (!result.success) throw new Error(result.error ?? 'Email delivery failed')
    return 'sent'
  } catch (error) {
    await prisma.analyticsReportRecipient.updateMany({
      where: { id: recipient.id, lastSentKey: periodKey, lastSentAt: claimedAt },
      data: { lastSentKey: recipient.lastSentKey, lastSentAt: recipient.lastSentAt },
    })
    console.error(`[cron/scheduled-analytics] delivery failed for recipient ${recipient.id}`, error)
    return 'failed'
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const restaurants = await prisma.restaurant.findMany({
    where: {
      analyticsReportFrequency: { in: ['daily', 'weekly'] },
      analyticsReportRecipients: {
        some: { disabledAt: null, verifiedAt: { not: null } },
      },
    },
    select: {
      id: true,
      name: true,
      analyticsReportFrequency: true,
      analyticsReportTimezone: true,
      analyticsReportLocale: true,
      analyticsReportRecipients: {
        where: { disabledAt: null, verifiedAt: { not: null } },
        select: { id: true, email: true, lastSentKey: true, lastSentAt: true },
      },
    },
  })

  const due = restaurants.flatMap((restaurant) => {
    if (
      !isAnalyticsReportFrequency(restaurant.analyticsReportFrequency) ||
      restaurant.analyticsReportFrequency === 'off'
    ) {
      return []
    }
    const run = getAnalyticsReportRun(
      now,
      restaurant.analyticsReportFrequency,
      restaurant.analyticsReportTimezone,
    )
    return run.isDue ? [{ restaurant, run }] : []
  })

  const deliveries = (
    await mapWithConcurrency(due, RESTAURANT_CONCURRENCY, async ({ restaurant, run }) => {
      const locale = isLocale(restaurant.analyticsReportLocale)
        ? restaurant.analyticsReportLocale
        : defaultLocale
      const [report, copy] = await Promise.all([
        getScheduledAnalyticsReport({
          restaurantId: restaurant.id,
          since: run.since,
          until: run.until,
        }),
        emailCopy(locale),
      ])
      const baseUrl = analyticsReportBaseUrl()
      const buildEmail = (unsubscribeUrl: string) =>
        scheduledAnalyticsEmailTemplate({
          restaurantName: restaurant.name,
          dateRange: formatAnalyticsReportDateRange(
            run.since,
            run.until,
            locale,
            restaurant.analyticsReportTimezone,
          ),
          locale,
          report,
          dashboardUrl: `${baseUrl}/dashboard/analytics`,
          preferencesUrl: `${baseUrl}/dashboard/settings#settings-analytics-reports`,
          unsubscribeUrl,
          copy,
        })
      const subject = copy.subject({ restaurantName: restaurant.name })

      return restaurant.analyticsReportRecipients.map((recipient): Delivery => ({
        restaurantId: restaurant.id,
        recipient,
        periodKey: run.periodKey,
        subject,
        htmlFor: (unsubscribeUrl) => buildEmail(unsubscribeUrl).html,
      }))
    })
  ).flat()

  const statuses = await mapWithConcurrency(deliveries, SEND_CONCURRENCY, deliver)
  const counts = { sent: 0, skipped: 0, failed: 0 }
  for (const status of statuses) counts[status] += 1

  return Response.json(
    { success: counts.failed === 0, restaurantsDue: due.length, ...counts },
    { status: counts.failed > 0 ? 500 : 200 },
  )
}
