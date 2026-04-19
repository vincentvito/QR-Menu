interface InviteTemplateParams {
  inviterName: string
  restaurantName: string
  acceptUrl: string
}

export function inviteEmailTemplate({
  inviterName,
  restaurantName,
  acceptUrl,
}: InviteTemplateParams) {
  const subject = `${inviterName} invited you to ${restaurantName} on QRmenucrafter`

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            QRmenucrafter
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">Digital QR menus for restaurants</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          <strong style="color: #1C1917;">${inviterName}</strong> invited you to join
          <strong style="color: #1C1917;">${restaurantName}</strong> on QRmenucrafter so you can help manage menus.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${acceptUrl}" style="display: inline-block; background-color: #1C1917; color: #FDFCFB; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 28px; border-radius: 9999px; letter-spacing: -0.005em;">
            Accept invitation
          </a>
        </div>

        <p style="font-size: 13px; color: #57534E; line-height: 1.5; margin: 0 0 8px 0;">
          Or copy this link into your browser:<br />
          <a href="${acceptUrl}" style="color: #1C1917; word-break: break-all;">${acceptUrl}</a>
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 16px 0 0 0;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>

        <div style="height: 1px; background-color: #E7E5E4; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #A8A29E; margin: 0;">
          QRmenucrafter &mdash; Turn any menu into a beautiful QR experience.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

type OtpType = 'sign-in' | 'email-verification' | 'forget-password'

interface OtpTemplateParams {
  otp: string
  type: OtpType
}

export function otpEmailTemplate({ otp, type }: OtpTemplateParams) {
  const subject =
    type === 'sign-in'
      ? 'Your QRmenucrafter login code'
      : type === 'email-verification'
        ? 'Verify your QRmenucrafter email'
        : 'Reset your QRmenucrafter password'

  const actionText =
    type === 'sign-in'
      ? 'Use this code to sign in to QRmenucrafter:'
      : type === 'email-verification'
        ? 'Use this code to verify your email address:'
        : 'Use this code to reset your password:'

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background-color: #FDFCFB; padding: 0;">
      <div style="max-width: 520px; margin: 0 auto; padding: 48px 24px;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 600; color: #1C1917; margin: 0 0 4px 0; letter-spacing: -0.015em;">
            QRmenucrafter
          </h1>
          <p style="font-size: 13px; color: #78716C; margin: 0;">Digital QR menus for restaurants</p>
        </div>

        <p style="font-size: 14px; color: #57534E; line-height: 1.6; margin: 0 0 24px 0;">
          ${actionText}
        </p>

        <div style="background-color: #ffffff; border: 1px solid #E7E5E4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #1C1917; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
            ${otp}
          </div>
        </div>

        <p style="font-size: 13px; color: #57534E; line-height: 1.5; margin: 0 0 8px 0;">
          This code expires in <strong style="color: #1C1917;">5 minutes</strong>.
        </p>
        <p style="font-size: 13px; color: #A8A29E; line-height: 1.5; margin: 0;">
          If you didn't request this code, you can safely ignore this email.
        </p>

        <div style="height: 1px; background-color: #E7E5E4; margin: 32px 0;"></div>

        <p style="font-size: 11px; color: #A8A29E; margin: 0;">
          QRmenucrafter &mdash; Turn any menu into a beautiful QR experience.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}
