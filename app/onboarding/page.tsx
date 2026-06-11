import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveMembership } from '@/lib/organizations/get-active'
import { BrandMark } from '@/components/brand/BrandMark'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { OnboardingFlow } from './OnboardingFlow'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Onboarding')
  return {
    title: t('title'),
    robots: { index: false, follow: false },
  }
}

export default async function OnboardingPage() {
  const [session, t] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getTranslations('Onboarding'),
  ])
  if (!session) redirect('/auth/login?callbackUrl=/onboarding')

  const membership = await getActiveMembership(session.user.id)
  if (membership) redirect('/dashboard')

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label={t('homeAria')}>
            <BrandMark size="md" />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-[clamp(20px,5vw,80px)] py-10">
        <div className="mx-auto mb-8 max-w-2xl space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>

        <OnboardingFlow initialUserName={session.user.name ?? ''} />
      </main>
    </div>
  )
}
