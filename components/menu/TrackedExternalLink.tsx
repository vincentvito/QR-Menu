'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { trackMenuEvent } from '@/lib/analytics/track'
import type { MenuEventType } from '@/lib/analytics/events'

interface TrackedExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  menuSlug: string
  trackType: MenuEventType
  trackPayload?: Record<string, unknown>
  children: ReactNode
}

// Drop-in `<a>` replacement for outbound links on the public menu. Emits
// a telemetry event on click without blocking navigation — analytics is
// fire-and-forget via `sendBeacon`, so there's no UX latency even on a
// slow connection.
export function TrackedExternalLink({
  menuSlug,
  trackType,
  trackPayload,
  onClick,
  children,
  ...rest
}: TrackedExternalLinkProps) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackMenuEvent({ menuSlug, type: trackType, payload: trackPayload })
        onClick?.(e)
      }}
    >
      {children}
    </a>
  )
}
