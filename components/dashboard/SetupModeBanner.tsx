import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Sparkles } from 'lucide-react'

export async function SetupModeBanner() {
  const t = await getTranslations('Dashboard.banners.setupMode')

  return (
    <div
      role="status"
      className="border-accent/35 bg-accent/15 text-foreground border-b px-4 py-3 shadow-[0_12px_34px_-30px_rgba(26,30,23,0.45)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-accent text-accent-foreground mt-0.5 grid size-9 shrink-0 place-items-center rounded-full shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <strong className="block text-sm font-semibold tracking-tight">{t('title')}</strong>
            <span className="text-muted-foreground mt-0.5 block text-sm leading-5">
              {t('message')}
            </span>
          </span>
        </div>
        <Link
          href="/dashboard/billing#plan-picker"
          className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-foreground inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold shadow-[0_12px_26px_-16px_rgba(26,30,23,0.7)] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {t('cta')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
