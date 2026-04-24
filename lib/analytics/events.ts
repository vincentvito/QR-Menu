// Shared event-type vocabulary between the public menu (emitter) and
// the analytics endpoint/dashboard (consumer). Keeping this centralized
// makes it easy to spot new event types being added and avoids typos
// across files.

export const MENU_EVENT_TYPES = [
  'view',
  'dish_image_tap',
  'language_change',
  'google_review_click',
  'wifi_reveal',
  'social_click',
  'menu_switch',
] as const

export type MenuEventType = (typeof MENU_EVENT_TYPES)[number]

export function isMenuEventType(value: unknown): value is MenuEventType {
  return typeof value === 'string' && (MENU_EVENT_TYPES as readonly string[]).includes(value)
}

// Session cookie name — public-menu anonymous session id. Not used for
// auth, not used for cross-site tracking. Random id only.
export const ANALYTICS_SESSION_COOKIE = 'qrmc_sid'
// 30 days — long enough to count returning guests as "same session" in
// the weekly view, short enough that long-abandoned devices don't skew.
export const ANALYTICS_SESSION_MAX_AGE = 60 * 60 * 24 * 30
