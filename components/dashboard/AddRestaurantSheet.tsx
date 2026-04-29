'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/menus/currency'

interface AddRestaurantSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRestaurant: {
    id: string
    name: string
  }
}

// Minimal "add another venue" flow. The only required field is a name;
// currency defaults to USD but is offered up front because it affects
// every price on the menu — easier to set now than to fix per-item later.
// On success we redirect to /dashboard/settings so the owner can finish
// branding (logo, colors, WiFi) before creating a menu.
export function AddRestaurantSheet({
  open,
  onOpenChange,
  currentRestaurant,
}: AddRestaurantSheetProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [submitting, setSubmitting] = useState<'add' | 'disable' | null>(null)
  const [capError, setCapError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [, startTransition] = useTransition()

  function reset() {
    setName('')
    setCurrency(DEFAULT_CURRENCY)
    setCapError('')
    setConfirmation('')
  }

  async function submit(mode: 'add' | 'disable') {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter a restaurant name')
      return
    }
    if (mode === 'disable' && !canDisableCurrentRestaurant) {
      toast.error('Type confirm to disable the current restaurant')
      return
    }
    setSubmitting(mode)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          currency,
          ...(mode === 'disable' ? { disableRestaurantId: currentRestaurant.id } : {}),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        slug?: string
        error?: string
        gate?: string
      }
      if (!res.ok) {
        if (body.gate === 'plan-cap') {
          setCapError(body.error ?? 'Your plan is at its restaurant limit.')
        }
        toast.error(body.error ?? 'Could not add restaurant')
        return
      }
      toast.success(
        mode === 'disable'
          ? `${currentRestaurant.name} disabled and ${trimmed} added`
          : `${trimmed} added`,
      )
      onOpenChange(false)
      reset()
      // router.refresh() alone would swap the active restaurant in the
      // sidebar; push + refresh gets them to Settings where they can
      // finish onboarding the new venue.
      startTransition(() => {
        router.push('/dashboard/settings')
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit('add')
  }

  const busy = submitting !== null
  const canDisableCurrentRestaurant = confirmation.trim().toLowerCase() === 'confirm'

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add a restaurant</SheetTitle>
          <SheetDescription>
            Spin up another venue under your account. You&apos;ll finish branding — logo, colors,
            WiFi — in Settings next.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="restaurant-name">Restaurant name</Label>
            <Input
              id="restaurant-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setCapError('')
              }}
              placeholder="e.g. Via Napoli"
              maxLength={120}
              autoFocus
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="restaurant-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as CurrencyCode)}
              disabled={busy}
            >
              <SelectTrigger id="restaurant-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} · {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {capError ? (
            <div className="border-pop/30 bg-pop/5 rounded-xl border p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-pop mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="space-y-2">
                  <p className="font-medium">Your current plan is full.</p>
                  <p className="text-muted-foreground text-xs leading-5">
                    Disable {currentRestaurant.name} to clear the active slot and create this new
                    restaurant. The disabled restaurant is kept in your switcher as read-only, so
                    you can review it or delete it later from Settings.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="disable-confirmation">Type confirm to continue</Label>
                    <Input
                      id="disable-confirmation"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      autoComplete="off"
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </form>
        <SheetFooter>
          {capError ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => submit('disable')}
              disabled={busy || !name.trim() || !canDisableCurrentRestaurant}
            >
              {submitting === 'disable' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Disable current and add
            </Button>
          ) : null}
          <Button type="submit" onClick={handleSubmit} disabled={busy || !name.trim()}>
            {submitting === 'add' ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Add restaurant
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
