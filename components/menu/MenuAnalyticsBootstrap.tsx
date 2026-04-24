'use client'

import { useEffect } from 'react'
import { trackMenuEvent } from '@/lib/analytics/track'

interface MenuAnalyticsBootstrapProps {
  menuSlug: string
  language?: string
}

// Fires a single `view` event on mount. Mounting this near the top of
// the public menu page ensures the view fires before the guest has a
// chance to interact with anything else — and `useEffect` with an empty
// dep array means it runs exactly once per page session, not once per
// route re-render.
export function MenuAnalyticsBootstrap({ menuSlug, language }: MenuAnalyticsBootstrapProps) {
  useEffect(() => {
    trackMenuEvent({
      menuSlug,
      type: 'view',
      payload: language ? { language } : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
