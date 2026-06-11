'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy, Eye, EyeOff, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { trackMenuEvent } from '@/lib/analytics/track'

interface WifiRevealProps {
  ssid: string
  password: string | null
  hasPassword: boolean
  menuSlug: string
}

// Class reused by both the SSR placeholder and the real trigger — keeps
// the pill identical through hydration so the swap is invisible.
// Solid theme-background + theme-foreground so it stays legible on ANY
// header image or gradient, with a subtle ring + drop shadow to lift it
// off busy photos.
const TRIGGER_CLASS =
  'bg-background text-foreground hover:bg-card ring-foreground/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] ring-1 transition-colors'

export function WifiReveal({ ssid, password, hasPassword, menuSlug }: WifiRevealProps) {
  const t = useTranslations('WifiReveal')
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  // Radix Dialog generates an `aria-controls` via a counter-based useId.
  // In Next 16 + Turbopack the counter offsets differ between server and
  // client, producing a hydration mismatch. Deferring the Sheet mount
  // until after hydration avoids the SSR-vs-client ID difference entirely.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render an identical-looking placeholder during SSR and the first
    // client render. Non-interactive until the real Sheet takes over —
    // imperceptible because it lands instantly post-hydration.
    return (
      <button type="button" className={TRIGGER_CLASS} aria-hidden="true" tabIndex={-1}>
        <Wifi className="size-3.5" aria-hidden="true" />
        {t('trigger')}
      </button>
    )
  }

  async function copy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success(t('toast.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) trackMenuEvent({ menuSlug, type: 'wifi_reveal' })
        if (!next) setRevealed(false)
      }}
    >
      <SheetTrigger asChild>
        <button type="button" className={TRIGGER_CLASS}>
          <Wifi className="size-3.5" aria-hidden="true" />
          {t('trigger')}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Wifi className="size-5" aria-hidden="true" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="border-cream-line bg-background/50 rounded-2xl border p-4">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              {t('network')}
            </p>
            <p className="mt-1 font-mono text-base break-all">{ssid}</p>
          </div>

          {hasPassword ? (
            <div className="border-cream-line bg-background/50 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  {t('password')}
                </p>
                <button
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  aria-pressed={revealed}
                >
                  {revealed ? (
                    <>
                      <EyeOff className="size-3.5" aria-hidden="true" />
                      {t('hide')}
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" aria-hidden="true" />
                      {t('show')}
                    </>
                  )}
                </button>
              </div>
              <p
                className="mt-2 font-mono text-base break-all select-all"
                aria-label={revealed ? t('passwordAria') : t('passwordHiddenAria')}
              >
                {revealed ? (password ?? '') : '•'.repeat(Math.max(8, (password ?? '').length))}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={copy}
                disabled={!password}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    {t('copyPassword')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground border-cream-line bg-background/50 rounded-2xl border p-4 text-sm">
              {t('openNetwork')}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
