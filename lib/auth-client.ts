import { createAuthClient } from 'better-auth/react'
import {
  adminClient,
  emailOTPClient,
  organizationClient,
} from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [emailOTPClient(), organizationClient(), adminClient()],
})

export const { signIn, signOut, useSession } = authClient
