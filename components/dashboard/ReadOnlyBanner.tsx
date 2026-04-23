import Link from 'next/link'
import { Lock } from 'lucide-react'

interface ReadOnlyBannerProps {
  restaurantName: string
}

// Rendered whenever the active restaurant is flagged readOnly — usually
// because the plan was downgraded below the restaurant count. Public menus
// keep serving; the dashboard blocks writes until the user either picks this
// one as active on the billing page or upgrades.
export function ReadOnlyBanner({ restaurantName }: ReadOnlyBannerProps) {
  return (
    <div className="border-accent bg-accent/10 text-foreground flex items-center gap-2 border-b px-4 py-2 text-xs md:px-6">
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{restaurantName}</span> is read-only under your current plan. Editing is disabled until you re-activate it or upgrade.
      </span>
      <Link
        href="/dashboard/billing"
        className="hover:bg-foreground hover:text-background shrink-0 rounded-full border border-current px-3 py-1 font-medium transition-colors"
      >
        Manage billing
      </Link>
    </div>
  )
}
