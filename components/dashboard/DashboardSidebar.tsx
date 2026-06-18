'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  BarChart3,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  UserCheck,
  Users,
  Utensils,
} from 'lucide-react'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { BrandMark } from '@/components/brand/BrandMark'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { signOut } from '@/lib/auth-client'
import { formatDisplayName } from '@/lib/display-name'
import { TransitionLink } from '@/components/navigation/TransitionLink'
import { RestaurantSwitcher } from './RestaurantSwitcher'

// Nav items flagged `orgOnly` are hidden from restaurant-scoped staff
// (managers/waiters). Server writes on those pages already block staff, but
// the nav would otherwise leak links they'll only bounce off.
const NAV = [
  { href: '/dashboard/menus', labelKey: 'menus', icon: Utensils, orgOnly: false },
  { href: '/dashboard/staff', labelKey: 'staff', icon: UserCheck, orgOnly: false },
  { href: '/dashboard/analytics', labelKey: 'analytics', icon: BarChart3, orgOnly: true },
  { href: '/dashboard/team', labelKey: 'team', icon: Users, orgOnly: true },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings, orgOnly: true },
  { href: '/dashboard/billing', labelKey: 'billing', icon: CreditCard, orgOnly: true },
] as const

const ADMIN_NAV = { href: '/admin', labelKey: 'admin', icon: Shield } as const

interface DashboardSidebarProps {
  restaurant: { id: string; name: string; logo: string | null }
  restaurants: Array<{ id: string; slug: string; name: string }>
  viewer: { name: string; email: string; image: string | null; role: string }
  scope: 'org' | 'restaurant'
}

export function DashboardSidebar({
  restaurant,
  restaurants,
  viewer,
  scope,
}: DashboardSidebarProps) {
  const t = useTranslations('Dashboard.sidebar')
  const locale = useLocale()
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

  function renderNavLink({
    href,
    label,
    Icon,
  }: {
    href: string
    label: string
    Icon: React.ComponentType<{ className?: string }>
  }) {
    return (
      <DashboardSidebarLink href={href}>
        <Icon />
        <span>{label}</span>
      </DashboardSidebarLink>
    )
  }

  return (
    <Sidebar collapsible="icon" className="[view-transition-name:dashboard-sidebar]">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <Link href="/" aria-label={t('homeAria')} className="shrink-0">
            <BrandMark size="sm" />
          </Link>
        </div>
        <RestaurantSwitcher current={restaurant} restaurants={restaurants} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter((item) => scope === 'org' || !item.orgOnly).map((item) => {
                const isActive = pathname.startsWith(item.href)
                const label = t(`nav.${item.labelKey}`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                      className={collapsedButtonClass}
                    >
                      {renderNavLink({ href: item.href, label, Icon: item.icon })}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {viewer.role === 'admin' ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(ADMIN_NAV.href)}
                    tooltip={t('nav.admin')}
                    className={collapsedButtonClass}
                  >
                    {renderNavLink({
                      href: ADMIN_NAV.href,
                      label: t('nav.admin'),
                      Icon: ADMIN_NAV.icon,
                    })}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
            <LanguageSwitcher currentLocale={locale} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={viewer.email}
              className={collapsedButtonClass}
            >
              <DashboardSidebarLink href="/dashboard/profile">
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
              </DashboardSidebarLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t('signOut')}
              onClick={handleSignOut}
              className={collapsedButtonClass}
            >
              <LogOut />
              <span>{t('signOut')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

const DashboardSidebarLink = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentPropsWithoutRef<typeof Link>, 'href'> & { href: string }
>(function DashboardSidebarLink({ href, onClick, children, ...props }, ref) {
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  if (!isMobile) {
    return (
      <TransitionLink
        ref={ref}
        href={href}
        transitionType="nav-forward"
        onClick={onClick}
        {...props}
      >
        {children}
      </TransitionLink>
    )
  }

  return (
    <Link
      ref={ref}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey
        ) {
          return
        }

        event.preventDefault()
        setOpenMobile(false)
        window.setTimeout(() => {
          router.push(href)
        }, 120)
      }}
      {...props}
    >
      {children}
    </Link>
  )
})
