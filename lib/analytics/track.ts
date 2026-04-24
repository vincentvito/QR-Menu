'use client'

import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_MAX_AGE,
  type MenuEventType,
} from './events'

interface TrackArgs {
  menuSlug: string
  type: MenuEventType
  payload?: Record<string, unknown>
}

// Fire-and-forget analytics event emitter. Prefers `sendBeacon` (survives
// page unload during tab close or navigation) and falls back to `fetch`
// with `keepalive` for older browsers. Never throws, never blocks UI —
// the menu is the product, analytics is a passive observer.
export function trackMenuEvent({ menuSlug, type, payload }: TrackArgs): void {
  if (typeof window === 'undefined') return

  ensureSessionCookie()

  const body = JSON.stringify({ type, menuSlug, payload })
  const url = '/api/analytics/event'

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(url, blob)) return
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Swallow — analytics failures never surface to the guest.
    })
  } catch {
    // Same reason — never break a menu page over a failed beacon.
  }
}

// Lazily set the anonymous session cookie on first event. Doing it
// client-side avoids a blocking server round-trip on first page load.
// The id is a pure random UUID, never tied to a user.
function ensureSessionCookie(): void {
  if (typeof document === 'undefined') return
  const existing = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ANALYTICS_SESSION_COOKIE}=`))
  if (existing) return

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)

  document.cookie = `${ANALYTICS_SESSION_COOKIE}=${id}; Max-Age=${ANALYTICS_SESSION_MAX_AGE}; Path=/; SameSite=Lax`
}
