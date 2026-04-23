'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CreditCard, LogOut, Settings, UserCheck, Users, Utensils } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { BrandMark } from '@/components/brand/BrandMark'
import { signOut } from '@/lib/auth-client'
import { formatDisplayName } from '@/lib/display-name'
import { RestaurantSwitcher } from './RestaurantSwitcher'

const NAV = [
  { href: '/dashboard/menus', label: 'Menus', icon: Utensils },
  { href: '/dashboard/staff', label: 'Staff', icon: UserCheck },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
]

interface DashboardSidebarProps {
  restaurant: { id: string; name: string; logo: string | null }
  restaurants: Array<{ id: string; slug: string; name: string }>
  viewer: { name: string; email: string; image: string | null }
}

export function DashboardSidebar({ restaurant, restaurants, viewer }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const collapsedButtonClass = 'group-data-[collapsible=icon]:mx-auto'

  const displayName = formatDisplayName(viewer.name, viewer.email)
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  async function handleSignOut() {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <Link href="/" aria-label="QRmenucrafter home" className="shrink-0">
            <BrandMark size="sm" />
          </Link>
        </div>
        <RestaurantSwitcher current={restaurant} restaurants={restaurants} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={collapsedButtonClass}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={viewer.email}
              className={collapsedButtonClass}
            >
              <Link href="/dashboard/profile">
                <Avatar className="size-7">
                  <AvatarImage src={viewer.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-foreground text-background text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-medium">{displayName}</div>
                  <div className="text-muted-foreground truncate text-[11px]">{viewer.email}</div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={handleSignOut}
              className={collapsedButtonClass}
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
