import { cookies } from 'next/headers'
import { getDashboardContext } from '@/lib/dashboard/context'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { ReadOnlyBanner } from '@/components/dashboard/ReadOnlyBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ session, org, restaurant, restaurants }, cookieStore] = await Promise.all([
    getDashboardContext(),
    cookies(),
  ])

  // Read persisted sidebar state so the first paint matches the user's last
  // choice — avoids a flash where the sidebar toggles after hydration.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const impersonating = Boolean(session.session.impersonatedBy)

  return (
    <>
      {impersonating ? <ImpersonationBanner impersonatedEmail={session.user.email} /> : null}
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar
          restaurant={{ id: restaurant.id, name: restaurant.name, logo: org.logo }}
          restaurants={restaurants}
          viewer={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          }}
        />
        <SidebarInset>
          <header className="border-cream-line bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
            <SidebarTrigger />
          </header>
          {restaurant.readOnly ? <ReadOnlyBanner restaurantName={restaurant.name} /> : null}
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
