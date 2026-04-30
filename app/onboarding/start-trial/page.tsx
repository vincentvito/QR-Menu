import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveMembership } from '@/lib/organizations/get-active'
import prisma from '@/lib/prisma'
import { PLANS } from '@/lib/plans'
import { BrandMark } from '@/components/brand/BrandMark'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { StartTrialPanel } from './StartTrialPanel'

export const metadata: Metadata = {
  title: 'Start your trial',
  robots: { index: false, follow: false },
}

export default async function StartTrialPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login?callbackUrl=/onboarding/start-trial')

  const membership = await getActiveMembership(session.user.id)
  if (!membership) redirect('/onboarding')

  // If they already have any subscription row (trialing, active, past_due, even
  // canceled), this screen no longer applies — send them to the dashboard.
  const existing = await prisma.subscription.findFirst({
    where: { referenceId: membership.organizationId },
    select: { id: true },
  })
  if (existing) redirect('/dashboard')

  const plans = [PLANS.basic, PLANS.pro, PLANS.business]

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

      <main className="mx-auto max-w-4xl px-[clamp(20px,5vw,80px)] py-10">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Start your 14-day free trial</h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-sm">
            Pick the plan you want to try. We&apos;ll capture a card but won&apos;t charge for 14
            days — cancel anytime before then. You get 5 AI credits to play with image generation
            right away.
          </p>
        </div>

        <StartTrialPanel orgId={membership.organizationId} plans={plans} />
      </main>
    </div>
  )
}
