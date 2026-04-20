'use client'

import { useEffect, useState } from 'react'
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

interface WifiRevealProps {
  ssid: string
  password: string | null
  hasPassword: boolean
}

// Class reused by both the SSR placeholder and the real trigger — keeps
// the pill identical through hydration so the swap is invisible.
const TRIGGER_CLASS =
  'bg-background/10 text-background hover:bg-background/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors'

export function WifiReveal({ ssid, password, hasPassword }: WifiRevealProps) {
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
        WiFi
      </button>
    )
  }

  async function copy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success('Password copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — tap the password to select it')
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setRevealed(false)
      }}
    >
      <SheetTrigger asChild>
        <button type="button" className={TRIGGER_CLASS}>
          <Wifi className="size-3.5" aria-hidden="true" />
          WiFi
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Wifi className="size-5" aria-hidden="true" />
            WiFi access
          </SheetTitle>
          <SheetDescription>Tap to reveal and copy the password.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="border-cream-line bg-background/50 rounded-2xl border p-4">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Network
            </p>
            <p className="mt-1 font-mono text-base break-all">{ssid}</p>
          </div>

          {hasPassword ? (
            <div className="border-cream-line bg-background/50 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Password
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
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" aria-hidden="true" />
                      Show
                    </>
                  )}
                </button>
              </div>
              <p
                className="mt-2 font-mono text-base break-all select-all"
                aria-label={revealed ? 'WiFi password' : 'WiFi password, hidden'}
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
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy password
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground rounded-2xl border border-cream-line bg-background/50 p-4 text-sm">
              This network is open — no password needed.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
