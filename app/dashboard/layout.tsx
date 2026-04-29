import { cookies, headers } from 'next/headers'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getTrialState } from '@/lib/plans/billing-state'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { ReadOnlyBanner } from '@/components/dashboard/ReadOnlyBanner'
import { SubscriptionLapsedBanner } from '@/components/dashboard/SubscriptionLapsedBanner'
import { TrialBanner } from '@/components/dashboard/TrialBanner'
import { RouteViewTransition } from '@/components/navigation/RouteViewTransition'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Context first (cached, cheap — sets up the redirect story). Then fan
  // out the two remaining independent fetches in parallel.
  const { session, org, restaurant, restaurants, scope } = await getDashboardContext()
  const [cookieStore, requestHeaders, trial, subscriptionAccess] = await Promise.all([
    cookies(),
    headers(),
    getTrialState(org.id),
    getSubscriptionAccessState(org.id),
  ])

  // Read persisted sidebar state so the first paint matches the user's last
  // choice — avoids a flash where the sidebar toggles after hydration.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const impersonating = Boolean(session.session.impersonatedBy)
  const pathname = requestHeaders.get('x-pathname') ?? ''
  const hideLapsedBanner = isRouteHidden(pathname, {
    routes: ['/dashboard/billing', '/dashboard/menus/new'],
    prefixes: ['/dashboard/menus/'],
  })
  const hideReadOnlyBanner = isRouteHidden(pathname, {
    routes: ['/dashboard/menus/new'],
    prefixes: ['/dashboard/menus/'],
  })

  return (
    <>
      {impersonating ? <ImpersonationBanner impersonatedEmail={session.user.email} /> : null}
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo,
          }}
          restaurants={restaurants}
          scope={scope}
          viewer={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
            role: session.user.role ?? 'user',
          }}
        />
        <SidebarInset>
          <header className="border-cream-line bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md [view-transition-name:dashboard-header] md:px-6">
            <SidebarTrigger />
          </header>
          {subscriptionAccess.isLapsed && !hideLapsedBanner ? (
            <SubscriptionLapsedBanner
              endedAt={
                subscriptionAccess.latestSubscription?.endedAt ??
                subscriptionAccess.latestSubscription?.canceledAt ??
                subscriptionAccess.latestSubscription?.periodEnd ??
                subscriptionAccess.latestSubscription?.trialEnd ??
                null
              }
            />
          ) : trial ? (
            <TrialBanner trialEnd={trial.trialEnd} planName={trial.planName} />
          ) : null}
          {restaurant.readOnly && !subscriptionAccess.isLapsed && !hideReadOnlyBanner ? (
            <ReadOnlyBanner restaurantName={restaurant.name} />
          ) : null}
          <RouteViewTransition>{children}</RouteViewTransition>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}

function isRouteHidden(
  pathname: string,
  { routes, prefixes }: { routes: string[]; prefixes: string[] },
) {
  return routes.includes(pathname) || prefixes.some((prefix) => pathname.startsWith(prefix))
}
