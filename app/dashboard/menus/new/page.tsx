import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { NewMenuForm } from '@/components/dashboard/NewMenuForm'
import { TransitionLink } from '@/components/navigation/TransitionLink'

export default async function NewMenuPage() {
  const { restaurant } = await getDashboardContext()
  const [t, subscriptionAccess] = await Promise.all([
    getTranslations('Dashboard.newMenu'),
    getSubscriptionAccessState(restaurant.organizationId),
  ])
  const readOnlyReason = subscriptionAccess.isLapsed
    ? t('paused.subscriptionEnded')
    : restaurant.readOnly
      ? t('paused.readOnly')
      : null

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <TransitionLink
        href="/dashboard/menus"
        transitionType="nav-back"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        {t('backToMenus')}
      </TransitionLink>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('pageDescription')}</p>
      </div>

      {readOnlyReason ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-950">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold tracking-tight">{t('paused.title')}</h2>
              <p className="mt-1 text-sm leading-6">{readOnlyReason}</p>
              <Link
                href="/dashboard/billing"
                className="mt-4 inline-flex rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-red-100"
              >
                {t('paused.cta')}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <NewMenuForm />
      )}
    </main>
  )
}
