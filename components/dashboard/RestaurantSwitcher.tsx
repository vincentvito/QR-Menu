'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, ChevronsUpDown, Plus, Store } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddRestaurantSheet } from './AddRestaurantSheet'

interface RestaurantOption {
  id: string
  slug: string
  name: string
}

interface RestaurantSwitcherProps {
  current: { id: string; name: string; logo: string | null }
  restaurants: RestaurantOption[]
}

// Replaces the static sidebar identity block with a dropdown that lists every
// restaurant the user can access. Picking one hits /api/restaurants/set-active
// which pins it on the session; a router.refresh() brings the dashboard back
// with the new active restaurant wired through every RSC.
export function RestaurantSwitcher({ current, restaurants }: RestaurantSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  async function switchTo(restaurantId: string) {
    if (restaurantId === current.id) {
      setOpen(false)
      return
    }
    const res = await fetch('/api/restaurants/set-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })
    if (!res.ok) {
      // A failure here is rare (only when the restaurant was deleted mid-click
      // or the user's membership was revoked). Keep the dropdown open so they
      // can pick a different one instead of silently swallowing the error.
      console.error('Failed to switch restaurant', await res.text())
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="border-cream-line hover:bg-muted/50 data-[state=open]:bg-muted/50 flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:p-0 disabled:opacity-60"
          aria-label={`Current restaurant: ${current.name}. Click to switch.`}
        >
          {current.logo ? (
            <div className="border-cream-line bg-background relative size-7 shrink-0 overflow-hidden rounded-md border">
              <Image src={current.logo} alt="" fill unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-md">
              <Store className="size-3.5" aria-hidden="true" />
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
            {current.name}
          </span>
          <ChevronsUpDown
            className="text-muted-foreground size-3.5 shrink-0 group-data-[collapsible=icon]:hidden"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        className="w-[240px]"
        sideOffset={6}
      >
        <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Restaurants
        </DropdownMenuLabel>
        {restaurants.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => switchTo(r.id)}
            className="flex items-center gap-2"
          >
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            {r.id === current.id ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            // Radix closes the menu on select by default — we want that,
            // but we also need to open the sheet. preventDefault stops
            // auto-close so the menu state can settle before the sheet
            // mounts on top of it.
            e.preventDefault()
            setOpen(false)
            setAddOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span>Add restaurant</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
      <AddRestaurantSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
