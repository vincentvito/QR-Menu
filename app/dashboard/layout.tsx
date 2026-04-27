import { cookies } from 'next/headers'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getTrialState } from '@/lib/plans/billing-state'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { ReadOnlyBanner } from '@/components/dashboard/ReadOnlyBanner'
import { TrialBanner } from '@/components/dashboard/TrialBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Context first (cached, cheap — sets up the redirect story). Then fan
  // out the two remaining independent fetches in parallel.
  const { session, org, restaurant, restaurants, scope } = await getDashboardContext()
  const [cookieStore, trial] = await Promise.all([cookies(), getTrialState(org.id)])

  // Read persisted sidebar state so the first paint matches the user's last
  // choice — avoids a flash where the sidebar toggles after hydration.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const impersonating = Boolean(session.session.impersonatedBy)

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
          <header className="border-cream-line bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
            <SidebarTrigger />
          </header>
          {trial ? <TrialBanner trialEnd={trial.trialEnd} planName={trial.planName} /> : null}
          {restaurant.readOnly ? <ReadOnlyBanner restaurantName={restaurant.name} /> : null}
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
