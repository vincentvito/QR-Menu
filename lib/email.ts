interface SendEmailParams {
  to: string
  subject: string
  html: string
  // Extra MIME headers, e.g. List-Unsubscribe on scheduled reports.
  headers?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  // Set when credentials are missing and the message was logged instead of
  // sent. Unattended senders (scheduled reports) must treat this as a failure
  // so a misconfigured deploy doesn't look like a successful delivery.
  skipped?: boolean
  error?: string
}

// Sends transactional email via ZeptoMail. When credentials are missing the OTP
// is logged to the console so local auth flows work without real delivery.
export async function sendEmail({
  to,
  subject,
  html,
  headers,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiUrl = process.env.ZEPTOMAIL_API_URL
  const apiKey = process.env.ZEPTO_MAIL_API_KEY
  const fromEmail = process.env.EMAIL_FROM ?? 'noreply@qtable.ai'
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Qtable'

  if (!apiUrl || !apiKey) {
    console.warn('[email] ZeptoMail not configured — logging instead of sending')
    console.info(`[email] → ${to}\n  subject: ${subject}\n${html}`)
    return { success: true, skipped: true }
  }

  try {
    const res = await fetch(`https://${apiUrl}v1.1/email`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: html,
        textbody: html.replace(/<[^>]*>/g, ''),
        ...(headers ? { mime_headers: headers } : {}),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[email] ZeptoMail error:', res.status, err)
      return { success: false, error: `Email delivery failed (${res.status})` }
    }

    return { success: true }
  } catch (err) {
    console.error('[email] ZeptoMail error:', err)
    return { success: false, error: 'Email delivery failed' }
  }
}
