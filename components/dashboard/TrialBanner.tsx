import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Sparkles } from 'lucide-react'

interface TrialBannerProps {
  trialEnd: Date
  planName: string
}

// Top-of-dashboard bar shown only while the org is trialing. Urgent
// styling kicks in under 3 days so nobody is surprised by an expiring
// card charge.
export async function TrialBanner({ trialEnd, planName }: TrialBannerProps) {
  const t = await getTranslations('Dashboard.banners.trial')
  const msRemaining = trialEnd.getTime() - Date.now()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  const urgent = daysRemaining < 3

  const prettyPlan = planName.charAt(0).toUpperCase() + planName.slice(1)
  const label = t('daysLeft', { count: daysRemaining })

  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 border-b px-4 py-2 text-sm ${
        urgent
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-cream-line bg-accent/5 text-foreground'
      }`}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {label} · <span className="font-medium">{prettyPlan}</span> {t('planSuffix')}
      </span>
      <Link
        href="/dashboard/billing"
        className="shrink-0 text-xs font-medium underline-offset-4 hover:underline"
      >
        {t('manageBilling')}
      </Link>
    </div>
  )
}
