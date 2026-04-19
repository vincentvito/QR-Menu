'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Settings, Store, Users, Utensils } from 'lucide-react'
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

const NAV = [
  { href: '/dashboard/menus', label: 'Menus', icon: Utensils },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface DashboardSidebarProps {
  restaurant: { name: string; logo: string | null }
  viewer: { name: string; email: string; image: string | null }
}

export function DashboardSidebar({ restaurant, viewer }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
        <div className="flex items-center gap-2 px-2 py-1">
          <Link href="/" aria-label="QRmenucrafter home" className="shrink-0">
            <BrandMark size="sm" />
          </Link>
        </div>
        <div className="border-cream-line flex items-center gap-2 rounded-lg border px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:p-0">
          {restaurant.logo ? (
            <div className="border-cream-line bg-background relative size-7 shrink-0 overflow-hidden rounded-md border">
              <Image
                src={restaurant.logo}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-md">
              <Store className="size-3.5" aria-hidden="true" />
            </div>
          )}
          <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
            {restaurant.name}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
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
            <SidebarMenuButton asChild size="lg" tooltip={viewer.email}>
              <Link href="/dashboard/profile">
                <Avatar className="size-7">
                  <AvatarImage src={viewer.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-foreground text-background text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-medium">{displayName}</div>
                  <div className="text-muted-foreground truncate text-[11px]">
                    {viewer.email}
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
