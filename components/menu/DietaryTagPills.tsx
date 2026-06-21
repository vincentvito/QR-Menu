'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { isDietaryTagKey } from '@/lib/menus/dietary-tags'
import { DISMISS_OVERLAYS_EVENT } from '@/lib/menus/overlay-events'
import { cn } from '@/lib/utils'

interface DietaryTagPillsProps {
  tags: string[]
  className?: string
  pillClassName?: string
}

export function DietaryTagPills({ tags, className, pillClassName }: DietaryTagPillsProps) {
  const t = useTranslations('DietaryTags')
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <DietaryPill
          key={tag}
          tag={tag}
          label={isDietaryTagKey(tag) ? t(tag) : tag}
          pillClassName={pillClassName}
        />
      ))}
    </div>
  )
}

// A Popover (click/tap) rather than a Tooltip so the meaning reveals reliably
// on touch — Radix tooltips are hover/focus-only by design. The trigger is
// marked data-no-drag so a tap on it doesn't start the Polaroid card swipe it
// may sit inside. Controlled so we can also close it on DISMISS_OVERLAYS_EVENT:
// a card drag is pointerdown→move→up, not a clean outside click, so Radix's
// own outside-dismiss can't be relied on to close it as the card moves away.
function DietaryPill({
  tag,
  label,
  pillClassName,
}: {
  tag: string
  label: string
  pillClassName?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener(DISMISS_OVERLAYS_EVENT, close)
    return () => window.removeEventListener(DISMISS_OVERLAYS_EVENT, close)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${tag}: ${label}`}
          // Marks this as a no-drag zone so the Polaroid card it may sit
          // inside won't start a swipe when the pill is tapped. We don't
          // stopPropagation here — that would also block Radix's
          // outside-pointer dismissal, leaving the popover lingering.
          data-no-drag=""
          className={cn(
            'bg-accent/30 text-foreground focus-visible:ring-foreground rounded-[6px] px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            pillClassName,
          )}
        >
          {tag}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="bg-foreground text-background w-fit max-w-[220px] rounded-md border-none px-3 py-1.5 text-xs font-medium shadow-md"
      >
        {label}
      </PopoverContent>
    </Popover>
  )
}
