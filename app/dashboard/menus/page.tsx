import { Plus, QrCode, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getMenusForRestaurant } from '@/lib/menus/get'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { Button } from '@/components/ui/button'
import { MenuList } from '@/components/dashboard/MenuList'
import { TransitionLink } from '@/components/navigation/TransitionLink'

interface MenusPageProps {
  searchParams?: Promise<{ trial?: string }>
}

export default async function MenusPage({ searchParams }: MenusPageProps) {
  // Cached in getDashboardContext — the layout already resolved this, so
  // this call is a same-request cache hit, not a new round-trip.
  const { restaurant } = await getDashboardContext()
  const [t, menus, subscriptionAccess, params] = await Promise.all([
    getTranslations('Dashboard.pages.menus'),
    getMenusForRestaurant(restaurant.id),
    getSubscriptionAccessState(restaurant.organizationId),
    searchParams,
  ])
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const canCreateMenu = !restaurant.readOnly && !subscriptionAccess.isLapsed
  const showTrialStarted = params?.trial === 'started'
  const firstMenu = menus[0] ?? null

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {showTrialStarted ? (
        <section className="border-accent bg-accent/12 text-foreground mb-6 rounded-[20px] border p-4 shadow-[0_16px_42px_-36px_rgba(26,30,23,0.45)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="bg-accent text-accent-foreground mt-0.5 grid size-9 shrink-0 place-items-center rounded-full">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{t('trialStarted.title')}</h2>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {t('trialStarted.description')}
                </p>
              </div>
            </div>
            {firstMenu ? (
              <Button asChild size="sm" className="shrink-0">
                <TransitionLink
                  href={`/dashboard/menus/${firstMenu.slug}/edit`}
                  transitionType="nav-forward"
                >
                  {t('trialStarted.cta')}
                </TransitionLink>
              </Button>
            ) : (
              <Button asChild size="sm" className="shrink-0">
                <TransitionLink href="/dashboard/menus/new" transitionType="nav-forward">
                  <Plus className="size-4" aria-hidden="true" />
                  {t('newMenu')}
                </TransitionLink>
              </Button>
            )}
          </div>
        </section>
      ) : null}

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {canCreateMenu ? (
          <Button asChild size="sm">
            <TransitionLink href="/dashboard/menus/new" transitionType="nav-forward">
              <Plus className="size-4" aria-hidden="true" />
              <span>{t('newMenu')}</span>
            </TransitionLink>
          </Button>
        ) : (
          <Button size="sm" disabled>
            <Plus className="size-4" aria-hidden="true" />
            <span>{t('newMenu')}</span>
          </Button>
        )}
      </div>

      {menus.length === 0 ? (
        <div className="border-cream-line bg-card flex flex-col items-center justify-center rounded-[24px] border px-8 py-16 text-center">
          <div className="border-cream-line bg-background text-muted-foreground mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyDescription')}</p>
          {canCreateMenu ? (
            <Button asChild className="mt-5" size="sm">
              <TransitionLink href="/dashboard/menus/new" transitionType="nav-forward">
                <Plus className="size-4" aria-hidden="true" />
                <span>{t('newMenu')}</span>
              </TransitionLink>
            </Button>
          ) : (
            <Button className="mt-5" size="sm" disabled>
              <Plus className="size-4" aria-hidden="true" />
              <span>{t('newMenu')}</span>
            </Button>
          )}
        </div>
      ) : (
        <MenuList
          menus={menus.map((m) => ({
            id: m.id,
            slug: m.slug,
            name: m.name,
            createdAt: m.createdAt,
            itemCount: m._count.items,
          }))}
          publicBaseUrl={publicBaseUrl}
          isPublished={subscriptionAccess.hasActiveSubscription}
        />
      )}
    </main>
  )
}
