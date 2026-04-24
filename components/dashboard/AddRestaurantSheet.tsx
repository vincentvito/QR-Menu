'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
}

// Minimal "add another venue" flow. The only required field is a name;
// currency defaults to USD but is offered up front because it affects
// every price on the menu — easier to set now than to fix per-item later.
// On success we redirect to /dashboard/settings so the owner can finish
// branding (logo, colors, WiFi) before creating a menu.
export function AddRestaurantSheet({ open, onOpenChange }: AddRestaurantSheetProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  function reset() {
    setName('')
    setCurrency(DEFAULT_CURRENCY)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter a restaurant name')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, currency }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        slug?: string
        error?: string
        gate?: string
      }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not add restaurant')
        return
      }
      toast.success(`${trimmed} added`)
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
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add a restaurant</SheetTitle>
          <SheetDescription>
            Spin up another venue under your account. You&apos;ll finish
            branding — logo, colors, WiFi — in Settings next.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="restaurant-name">Restaurant name</Label>
            <Input
              id="restaurant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Via Napoli"
              maxLength={120}
              autoFocus
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="restaurant-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as CurrencyCode)}
              disabled={submitting}
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
        </form>
        <SheetFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Add restaurant
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
