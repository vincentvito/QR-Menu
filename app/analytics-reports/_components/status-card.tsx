import type { ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, CircleX, Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TONES = {
  success: { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600' },
  error: { icon: CircleX, className: 'bg-destructive/10 text-destructive' },
  prompt: { icon: Mail, className: 'bg-accent/15 text-foreground' },
} as const

interface StatusCardProps {
  tone: keyof typeof TONES
  title: string
  body: string
  homeAria: string
  children: ReactNode
}

// Shell shared by the confirmation prompt and the result page so an opted-out
// recipient sees one consistent surface across both steps.
export function AnalyticsReportStatusCard({
  tone,
  title,
  body,
  homeAria,
  children,
}: StatusCardProps) {
  const { icon: Icon, className } = TONES[tone]

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="border-cream-line bg-card w-full max-w-md rounded-2xl border p-8 text-center shadow-sm">
        <Link href="/" aria-label={homeAria} className="mb-8 inline-flex">
          <BrandMark />
        </Link>
        <div
          className={cn(
            'mx-auto mb-4 flex size-12 items-center justify-center rounded-full',
            className,
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">{body}</p>
        <div className="mt-7 space-y-2">{children}</div>
      </div>
    </main>
  )
}

export type AnalyticsReportResultStatus = 'verified' | 'unsubscribed' | 'invalid'

export async function AnalyticsReportResultCard({
  status,
  restaurant,
}: {
  status: AnalyticsReportResultStatus
  restaurant?: string
}) {
  const t = await getTranslations('AnalyticsReportEmailPreferences')
  const successful = status !== 'invalid'

  return (
    <AnalyticsReportStatusCard
      tone={successful ? 'success' : 'error'}
      title={t(`${status}.title`)}
      body={t(`${status}.body`, { restaurant: restaurant ?? t('thisRestaurant') })}
      homeAria={t('homeAria')}
    >
      <Button asChild className="w-full">
        <Link href={successful ? '/dashboard/settings#settings-analytics-reports' : '/'}>
          {successful ? t('manageSettings') : t('returnHome')}
        </Link>
      </Button>
    </AnalyticsReportStatusCard>
  )
}
