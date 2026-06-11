import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Lock } from 'lucide-react'

interface ReadOnlyBannerProps {
  restaurantName: string
}

// Rendered whenever the active restaurant is flagged readOnly. Public menus
// keep serving; the dashboard blocks writes until the user reactivates it or
// upgrades.
export async function ReadOnlyBanner({ restaurantName }: ReadOnlyBannerProps) {
  const t = await getTranslations('Dashboard.banners.readOnly')

  return (
    <div className="border-accent bg-accent/10 text-foreground flex items-center gap-2 border-b px-4 py-2 text-xs md:px-6">
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {t.rich('message', {
          restaurant: () => <span className="font-medium">{restaurantName}</span>,
        })}
      </span>
      <Link
        href="/dashboard/billing"
        className="hover:bg-foreground hover:text-background shrink-0 rounded-full border border-current px-3 py-1 font-medium transition-colors"
      >
        {t('manageBilling')}
      </Link>
    </div>
  )
}
