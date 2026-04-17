import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { otpEmailTemplate } from '@/lib/email-templates'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false,
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
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
})
