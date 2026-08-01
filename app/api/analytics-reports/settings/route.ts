import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { defaultLocale, isLocale } from '@/i18n/locales'
import { getAnalyticsReportSettingsAccess } from '@/lib/analytics/report-settings-access'
import { isAnalyticsReportFrequency, isValidTimeZone } from '@/lib/analytics/report-schedule'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

async function recipientsFor(restaurantId: string) {
  const recipients = await prisma.analyticsReportRecipient.findMany({
    where: { restaurantId, disabledAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, verifiedAt: true },
  })
  return recipients.map(({ id, email, verifiedAt }) => ({
    id,
    email,
    verified: Boolean(verifiedAt),
  }))
}

export async function PATCH(request: Request) {
  const [access, t] = await Promise.all([
    getAnalyticsReportSettingsAccess(),
    getTranslations('Api'),
  ])
  if (!access.ok) {
    return NextResponse.json(
      { error: t(access.messageKey, access.params) },
      { status: access.status },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || !isAnalyticsReportFrequency(body.frequency)) {
    return NextResponse.json({ error: t('analyticsReports.invalidFrequency') }, { status: 400 })
  }
  if (!isValidTimeZone(body.timezone)) {
    return NextResponse.json({ error: t('analyticsReports.invalidTimezone') }, { status: 400 })
  }

  const locale =
    typeof body.locale === 'string' && isLocale(body.locale) ? body.locale : defaultLocale
  const restaurantId = access.restaurant.id

  await prisma.$transaction(async (tx) => {
    await tx.restaurant.update({
      where: { id: restaurantId },
      data: {
        analyticsReportFrequency: body.frequency,
        analyticsReportTimezone: body.timezone,
        analyticsReportLocale: locale,
      },
    })

    if (body.frequency !== 'off') {
      const email = access.session.user.email.trim().toLowerCase()
      await tx.analyticsReportRecipient.upsert({
        where: { restaurantId_email: { restaurantId, email } },
        create: { restaurantId, email, verifiedAt: new Date() },
        update: { verifiedAt: new Date(), disabledAt: null },
      })
    }
  })

  return NextResponse.json({
    frequency: body.frequency,
    timezone: body.timezone,
    locale,
    recipients: await recipientsFor(restaurantId),
  })
}
