import { Plus, QrCode } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getMenusForRestaurant } from '@/lib/menus/get'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { Button } from '@/components/ui/button'
import { MenuList } from '@/components/dashboard/MenuList'
import { TransitionLink } from '@/components/navigation/TransitionLink'

export default async function MenusPage() {
  // Cached in getDashboardContext — the layout already resolved this, so
  // this call is a same-request cache hit, not a new round-trip.
  const { restaurant } = await getDashboardContext()
  const [t, menus, subscriptionAccess] = await Promise.all([
    getTranslations('Dashboard.pages.menus'),
    getMenusForRestaurant(restaurant.id),
    getSubscriptionAccessState(restaurant.organizationId),
  ])
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const canCreateMenu = !restaurant.readOnly && !subscriptionAccess.isLapsed

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
