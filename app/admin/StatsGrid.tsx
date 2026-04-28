import {
  CreditCard,
  Gift,
  Mail,
  QrCode,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformStats } from '@/lib/admin/stats'

interface StatsGridProps {
  stats: PlatformStats
  className?: string
}

export function StatsGrid({ stats, className }: StatsGridProps) {
  const cards = [
    {
      icon: UserPlus,
      label: 'Signups today',
      value: stats.users.today,
      sub: `${stats.users.last7Days} in the last 7 days`,
    },
    {
      icon: Users,
      label: 'Total users',
      value: stats.users.total,
      sub: null,
    },
    {
      icon: CreditCard,
      label: 'Billing orgs',
      value: stats.organizations.total,
      sub: `${stats.organizations.paying} paying, ${stats.organizations.trialing} trialing`,
    },
    {
      icon: Gift,
      label: 'Comp orgs',
      value: stats.organizations.comped,
      sub:
        stats.organizations.lapsed > 0
          ? `${stats.organizations.lapsed} lapsed`
          : 'Owner-granted access',
    },
    {
      icon: Store,
      label: 'Restaurants',
      value: stats.restaurants.total,
      sub:
        stats.restaurants.active === stats.restaurants.total
          ? `all active`
          : `${stats.restaurants.active} active`,
    },
    {
      icon: QrCode,
      label: 'Menus',
      value: stats.menus.total,
      sub: null,
    },
    {
      icon: Utensils,
      label: 'Menu items',
      value: stats.menus.items,
      sub: null,
    },
    {
      icon: Mail,
      label: 'Pending invites',
      value: stats.invitations.pending,
      sub: null,
    },
  ]

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp
  label: string
  value: number
  sub: string | null
}) {
  return (
    <div className="border-cream-line bg-card rounded-2xl border p-5">
      <div className="flex items-center gap-3">
        <div className="bg-background text-muted-foreground border-cream-line flex size-9 items-center justify-center rounded-xl border">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          {label}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      {sub ? <p className="text-muted-foreground mt-1 text-xs">{sub}</p> : null}
    </div>
  )
}
