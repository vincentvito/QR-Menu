interface InviteTemplateParams {
  inviterName: string
  restaurantName: string
  acceptUrl: string
  copy: InviteEmailCopy
}

export function inviteEmailTemplate({
  inviterName,
  restaurantName,
  acceptUrl,
  copy,
}: InviteTemplateParams) {
  const safeInviterName = escapeHtml(inviterName)
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeAcceptUrl = escapeHtml(acceptUrl)
  const subject = copy.subject({ inviterName, restaurantName })

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            Qtable
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">${copy.tagline}</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          ${copy.body({
            inviterName: `<strong style="color: #1C1917;">${safeInviterName}</strong>`,
            restaurantName: `<strong style="color: #1C1917;">${safeRestaurantName}</strong>`,
          })}
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${safeAcceptUrl}" style="display: inline-block; background-color: #1C1917; color: #FDFCFB; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 9999px; letter-spacing: -0.005em;">
            ${copy.button}
          </a>
        </div>

        <p style="font-size: 13px; color: #57534E; line-height: 1.5; margin: 0 0 8px 0;">
          ${copy.copyLink}<br />
          <a href="${safeAcceptUrl}" style="color: #1C1917; word-break: break-all;">${safeAcceptUrl}</a>
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 16px 0 0 0;">
          ${copy.ignore}
        </p>

        <div style="height: 1px; background-color: #E7E5E4; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #A8A29E; margin: 0;">
          Qtable &mdash; ${copy.footer}
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

interface RestaurantInviteTemplateParams {
  inviterName: string
  restaurantName: string
  role: string
  acceptUrl: string
  copy: RestaurantInviteEmailCopy
}

export function restaurantInviteEmailTemplate({
  inviterName,
  restaurantName,
  role,
  acceptUrl,
  copy,
}: RestaurantInviteTemplateParams) {
  const safeInviterName = escapeHtml(inviterName)
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeRole = escapeHtml(role)
  const safeAcceptUrl = escapeHtml(acceptUrl)
  const subject = copy.subject({ inviterName, restaurantName })

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            Qtable
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">${copy.tagline}</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          ${copy.body({
            inviterName: `<strong style="color: #1C1917;">${safeInviterName}</strong>`,
            restaurantName: `<strong style="color: #1C1917;">${safeRestaurantName}</strong>`,
            role: `<strong style="color: #1C1917;">${safeRole}</strong>`,
          })}
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${safeAcceptUrl}" style="display: inline-block; background-color: #1C1917; color: #FDFCFB; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 9999px; letter-spacing: -0.005em;">
            ${copy.button}
          </a>
        </div>

        <p style="font-size: 13px; color: #57534E; line-height: 1.5; margin: 0 0 8px 0;">
          ${copy.copyLink}<br />
          <a href="${safeAcceptUrl}" style="color: #1C1917; word-break: break-all;">${safeAcceptUrl}</a>
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 16px 0 0 0;">
          ${copy.ignore}
        </p>

        <div style="height: 1px; background-color: #E7E5E4; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #A8A29E; margin: 0;">
          Qtable &mdash; ${copy.footer}
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'

interface OtpTemplateParams {
  otp: string
  type: OtpType
  copy: OtpEmailCopy
}

export function otpEmailTemplate({ otp, type, copy }: OtpTemplateParams) {
  const subject = copy.subject[type]
  const actionText = copy.action[type]
  const safeOtp = escapeHtml(otp)

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            Qtable
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">${copy.tagline}</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          ${actionText}
        </p>

        <div style="background-color: #ffffff; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #1C1917; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
            ${safeOtp}
          </div>
        </div>

        <p style="font-size: 13px; color: #57534E; line-height: 1.5; margin: 0 0 8px 0;">
          ${copy.expires}
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 0;">
          ${copy.ignore}
        </p>

        <div style="height: 1px; background-color: #E7E5E4; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #A8A29E; margin: 0;">
          Qtable &mdash; ${copy.footer}
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

interface ScheduledAnalyticsTemplateParams {
  restaurantName: string
  dateRange: string
  locale: string
  report: ScheduledAnalyticsSummary
  dashboardUrl: string
  preferencesUrl: string
  unsubscribeUrl: string
  copy: ScheduledAnalyticsEmailCopy
}

export function scheduledAnalyticsEmailTemplate({
  restaurantName,
  dateRange,
  locale,
  report,
  dashboardUrl,
  preferencesUrl,
  unsubscribeUrl,
  copy,
}: ScheduledAnalyticsTemplateParams) {
  const numberFormatter = new Intl.NumberFormat(locale)
  const safeDashboardUrl = escapeHtml(dashboardUrl)
  const safePreferencesUrl = escapeHtml(preferencesUrl)
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl)
  const hasActivity =
    report.scans + report.uniqueGuests + report.reviewClicks + report.wifiReveals > 0

  const metric = (label: string, value: number) => `
    <td style="width: 50%; padding: 14px 16px; border: 1px solid #E7E5E4;">
      <div style="font-size: 22px; font-weight: 650; color: #1C1917; line-height: 1.1;">
        ${escapeHtml(numberFormatter.format(value))}
      </div>
      <div style="font-size: 11px; color: #78716C; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.06em;">
        ${escapeHtml(label)}
      </div>
    </td>
  `

  const subject = copy.subject({ restaurantName })
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 560px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            Qtable
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">${escapeHtml(copy.tagline)}</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 28px 0;">
          ${escapeHtml(copy.intro({ restaurantName, dateRange }))}
        </p>

        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FFFFFF;">
          <tr>
            ${metric(copy.scans, report.scans)}
            ${metric(copy.uniqueGuests, report.uniqueGuests)}
          </tr>
          <tr>
            ${metric(copy.reviewClicks, report.reviewClicks)}
            ${metric(copy.wifiReveals, report.wifiReveals)}
          </tr>
        </table>

        ${
          hasActivity
            ? ''
            : `<p style="font-size: 13px; color: #78716C; line-height: 1.5; margin: 4px 0 24px 0;">${escapeHtml(copy.noActivity)}</p>`
        }

        <div style="text-align: center; margin: 28px 0 32px 0;">
          <a href="${safeDashboardUrl}" style="display: inline-block; background-color: #1C1917; color: #FDFCFB; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 9999px;">
            ${escapeHtml(copy.openAnalytics)}
          </a>
        </div>

        <div style="height: 1px; background-color: #E7E5E4; margin: 0 0 20px 0;"></div>
        <p style="font-size: 11px; color: #A8A29E; line-height: 1.5; margin: 0 0 8px 0;">
          ${escapeHtml(copy.footer)}
        </p>
        <a href="${safePreferencesUrl}" style="font-size: 11px; color: #78716C;">
          ${escapeHtml(copy.managePreferences)}
        </a>
        <span style="font-size: 11px; color: #A8A29E;"> &middot; </span>
        <a href="${safeUnsubscribeUrl}" style="font-size: 11px; color: #78716C;">
          ${escapeHtml(copy.unsubscribe)}
        </a>
      </div>
    </div>
  `

  return { subject, html }
}

interface AnalyticsRecipientVerificationTemplateParams {
  restaurantName: string
  confirmationUrl: string
  copy: AnalyticsRecipientVerificationEmailCopy
}

export function analyticsRecipientVerificationEmailTemplate({
  restaurantName,
  confirmationUrl,
  copy,
}: AnalyticsRecipientVerificationTemplateParams) {
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeConfirmationUrl = escapeHtml(confirmationUrl)
  const subject = copy.subject({ restaurantName })
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">Qtable</h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">${escapeHtml(copy.tagline)}</p>
        </div>
        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          ${copy.body({ restaurantName: `<strong style="color: #1C1917;">${safeRestaurantName}</strong>` })}
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${safeConfirmationUrl}" style="display: inline-block; background-color: #1C1917; color: #FDFCFB; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 9999px;">
            ${escapeHtml(copy.button)}
          </a>
        </div>
        <p style="font-size: 13px; color: #78716C; line-height: 1.5; margin: 0 0 8px 0;">
          ${escapeHtml(copy.copyLink)}<br />
          <a href="${safeConfirmationUrl}" style="color: #1C1917; word-break: break-all;">${safeConfirmationUrl}</a>
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 16px 0 0 0;">${escapeHtml(copy.ignore)}</p>
      </div>
    </div>
  `

  return { subject, html }
}

type RichValueFormatter<T extends string> = (values: Record<T, string>) => string

export interface InviteEmailCopy {
  tagline: string
  subject: (values: { inviterName: string; restaurantName: string }) => string
  body: RichValueFormatter<'inviterName' | 'restaurantName'>
  button: string
  copyLink: string
  ignore: string
  footer: string
}

export interface RestaurantInviteEmailCopy extends Omit<InviteEmailCopy, 'body'> {
  body: RichValueFormatter<'inviterName' | 'restaurantName' | 'role'>
}

export interface OtpEmailCopy {
  tagline: string
  subject: Record<OtpType, string>
  action: Record<OtpType, string>
  expires: string
  ignore: string
  footer: string
}

export interface ScheduledAnalyticsSummary {
  scans: number
  uniqueGuests: number
  reviewClicks: number
  wifiReveals: number
}

export interface ScheduledAnalyticsEmailCopy {
  tagline: string
  subject: (values: { restaurantName: string }) => string
  intro: (values: { restaurantName: string; dateRange: string }) => string
  scans: string
  uniqueGuests: string
  reviewClicks: string
  wifiReveals: string
  noActivity: string
  openAnalytics: string
  managePreferences: string
  unsubscribe: string
  footer: string
}

export interface AnalyticsRecipientVerificationEmailCopy {
  tagline: string
  subject: (values: { restaurantName: string }) => string
  body: RichValueFormatter<'restaurantName'>
  button: string
  copyLink: string
  ignore: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
