import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getCachedSession } from '@/lib/auth'
import { getDashboardContext } from '@/lib/dashboard/context'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { RouteViewTransition } from '@/components/navigation/RouteViewTransition'
import { AdminTabs } from './AdminTabs'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession()
  if (!session) redirect('/auth/login?callbackUrl=/admin')
  // Don't leak admin's existence to non-admins.
  if (session.user.role !== 'admin') notFound()

  const [{ restaurant, restaurants, scope }, cookieStore] = await Promise.all([
    getDashboardContext(),
    cookies(),
  ])
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
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
        <header className="border-cream-line bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md [view-transition-name:admin-header] md:px-6">
          <SidebarTrigger />
          <div className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
            Platform admin
          </div>
        </header>
        <div className="border-cream-line border-b px-4 md:px-6">
          <AdminTabs />
        </div>
        <RouteViewTransition>{children}</RouteViewTransition>
      </SidebarInset>
    </SidebarProvider>
  )
}
