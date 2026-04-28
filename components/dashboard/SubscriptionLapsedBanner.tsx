import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface SubscriptionLapsedBannerProps {
  endedAt: Date | null
}

function formatDate(date: Date | null): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function SubscriptionLapsedBanner({ endedAt }: SubscriptionLapsedBannerProps) {
  const endedLabel = formatDate(endedAt)

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-950"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-center sm:flex-none">
        Subscription ended{endedLabel ? ` ${endedLabel}` : ''}. Public menus stay live, but
        dashboard editing is paused.
      </span>
      <Link
        href="/dashboard/billing"
        className="shrink-0 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold transition-colors hover:bg-red-100"
      >
        Pick a plan
      </Link>
    </div>
  )
}
