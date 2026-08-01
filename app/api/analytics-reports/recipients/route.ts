import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/locales'
import { defaultLocale, isLocale } from '@/i18n/locales'
import {
  analyticsReportConfirmUrl,
  createAnalyticsReportEmailToken,
} from '@/lib/analytics/report-links'
import { getAnalyticsReportSettingsAccess } from '@/lib/analytics/report-settings-access'
import { sendEmail } from '@/lib/email'
import {
  analyticsRecipientVerificationEmailTemplate,
  type AnalyticsRecipientVerificationEmailCopy,
} from '@/lib/email-templates'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_RECIPIENTS = 10
const VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

function cleanEmail(value: unknown) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function serializeRecipient(recipient: { id: string; email: string; verifiedAt: Date | null }) {
  return { id: recipient.id, email: recipient.email, verified: Boolean(recipient.verifiedAt) }
}

async function verificationCopy(locale: Locale): Promise<AnalyticsRecipientVerificationEmailCopy> {
  const t = await getTranslations({ locale, namespace: 'Email' })
  return {
    tagline: t('common.tagline'),
    subject: ({ restaurantName }) =>
      t('analyticsRecipientVerification.subject', { restaurantName }),
    body: ({ restaurantName }) => t('analyticsRecipientVerification.body', { restaurantName }),
    button: t('analyticsRecipientVerification.button'),
    copyLink: t('analyticsRecipientVerification.copyLink'),
    ignore: t('analyticsRecipientVerification.ignore'),
  }
}

export async function POST(request: Request) {
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
  const email = cleanEmail(body?.email)
  if (!email) {
    return NextResponse.json({ error: t('analyticsReports.invalidEmail') }, { status: 400 })
  }

  const restaurantId = access.restaurant.id
  const isAccountEmail = email === access.session.user.email.trim().toLowerCase()
  const existing = await prisma.analyticsReportRecipient.findUnique({
    where: { restaurantId_email: { restaurantId, email } },
    select: { id: true, email: true, verifiedAt: true, disabledAt: true, updatedAt: true },
  })

  if (!existing || existing.disabledAt) {
    const activeCount = await prisma.analyticsReportRecipient.count({
      where: { restaurantId, disabledAt: null },
    })
    if (activeCount >= MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: t('analyticsReports.recipientLimit', { limit: MAX_RECIPIENTS }) },
        { status: 409 },
      )
    }
  }

  // Every upsert below bumps `updatedAt`, so for an address still awaiting
  // confirmation it doubles as "when we last mailed it". Without this,
  // re-submitting the same address sends a confirmation on every request.
  if (
    existing &&
    !existing.verifiedAt &&
    !isAccountEmail &&
    Date.now() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return NextResponse.json({ error: t('analyticsReports.confirmationCooldown') }, { status: 429 })
  }

  const recipient = await prisma.analyticsReportRecipient.upsert({
    where: { restaurantId_email: { restaurantId, email } },
    create: { restaurantId, email, verifiedAt: isAccountEmail ? new Date() : null },
    update: {
      disabledAt: null,
      ...(isAccountEmail ? { verifiedAt: new Date() } : {}),
    },
    select: { id: true, email: true, verifiedAt: true },
  })

  if (!recipient.verifiedAt) {
    const locale =
      typeof body.locale === 'string' && isLocale(body.locale) ? body.locale : defaultLocale
    const token = createAnalyticsReportEmailToken(
      'verify',
      recipient.id,
      restaurantId,
      new Date(Date.now() + VERIFY_TTL_MS),
    )
    const { subject, html } = analyticsRecipientVerificationEmailTemplate({
      restaurantName: access.restaurant.name,
      confirmationUrl: analyticsReportConfirmUrl('verify', token),
      copy: await verificationCopy(locale),
    })
    const sent = await sendEmail({ to: recipient.email, subject, html })
    if (!sent.success) {
      return NextResponse.json({ error: t('analyticsReports.confirmationFailed') }, { status: 502 })
    }
  }

  return NextResponse.json({
    recipient: serializeRecipient(recipient),
    confirmationSent: !recipient.verifiedAt,
  })
}

export async function DELETE(request: Request) {
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
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  const restaurantId = access.restaurant.id
  const disabled = await prisma.analyticsReportRecipient.updateMany({
    where: { id: body.id, restaurantId, disabledAt: null },
    data: { disabledAt: new Date() },
  })
  if (disabled.count === 0) {
    return NextResponse.json({ error: t('analyticsReports.recipientNotFound') }, { status: 404 })
  }

  const remaining = await prisma.analyticsReportRecipient.count({
    where: { restaurantId, disabledAt: null, verifiedAt: { not: null } },
  })
  if (remaining === 0) {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { analyticsReportFrequency: 'off' },
    })
  }

  return NextResponse.json({ disabled: true, reportsDisabled: remaining === 0 })
}
