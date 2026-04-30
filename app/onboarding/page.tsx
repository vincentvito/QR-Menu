import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveMembership } from '@/lib/organizations/get-active'
import { BrandMark } from '@/components/brand/BrandMark'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { OnboardingFlow } from './OnboardingFlow'

export const metadata: Metadata = {
  title: 'Set up your restaurant',
  robots: { index: false, follow: false },
}

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login?callbackUrl=/onboarding')

  const membership = await getActiveMembership(session.user.id)
  if (membership) redirect('/dashboard')

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="md" />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-[clamp(20px,5vw,80px)] py-10">
        <div className="mx-auto mb-8 max-w-2xl space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Set up your restaurant</h1>
          <p className="text-muted-foreground text-sm">
            Drop in your website and we&apos;ll pull the name, description, logo, and brand colors.
            You can also fill it in by hand.
          </p>
        </div>

        <OnboardingFlow initialUserName={session.user.name ?? ''} />
      </main>
    </div>
  )
}
