import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, emailOTP, organization } from 'better-auth/plugins'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { otpEmailTemplate, inviteEmailTemplate } from '@/lib/email-templates'

// Emails that should be promoted to the platform admin role on signup.
// Promotion happens via the user-create hook below.
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-elevate known platform owners to admin on signup. Keeps the
          // first-deploy experience frictionless — just sign up with your
          // email and you land with admin privileges.
          if (PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return { data: { ...user, role: 'admin' } }
          }
          return { data: user }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        const { subject, html } = otpEmailTemplate({ otp, type })
        await sendEmail({ to: email, subject, html })
      },
    }),
    organization({
      creatorRole: 'owner',
      schema: {
        organization: {
          additionalFields: {
            description: { type: 'string', required: false },
            primaryColor: { type: 'string', required: false },
            secondaryColor: { type: 'string', required: false },
            currency: { type: 'string', required: false, defaultValue: 'USD' },
            sourceUrl: { type: 'string', required: false },
            qrDotStyle: { type: 'string', required: false, defaultValue: 'square' },
            qrCornerStyle: { type: 'string', required: false, defaultValue: 'square' },
            qrForegroundColor: { type: 'string', required: false, defaultValue: '#1C1917' },
            qrBackgroundColor: { type: 'string', required: false, defaultValue: '#FDFCFB' },
            qrCenterType: { type: 'string', required: false, defaultValue: 'none' },
            qrCenterText: { type: 'string', required: false },
            wifiSsid: { type: 'string', required: false },
            wifiPassword: { type: 'string', required: false },
            wifiEncryption: { type: 'string', required: false, defaultValue: 'WPA' },
            wifiCenterType: { type: 'string', required: false, defaultValue: 'none' },
            wifiCenterText: { type: 'string', required: false },
            googleReviewUrl: { type: 'string', required: false },
            instagramUrl: { type: 'string', required: false },
            tiktokUrl: { type: 'string', required: false },
            facebookUrl: { type: 'string', required: false },
            templateId: { type: 'string', required: false, defaultValue: 'default' },
            theme: { type: 'string', required: false, defaultValue: 'editorial' },
            seasonalOverlay: { type: 'string', required: false, defaultValue: 'none' },
          },
        },
      },
      sendInvitationEmail: async ({ email, invitation, organization, inviter }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
        const acceptUrl = `${baseUrl}/accept-invite?invitationId=${invitation.id}`
        const inviterName =
          inviter.user.name?.trim() || inviter.user.email || 'A teammate'
        const { subject, html } = inviteEmailTemplate({
          inviterName,
          restaurantName: organization.name,
          acceptUrl,
        })
        await sendEmail({ to: email, subject, html })
      },
    }),
    admin(),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
})
