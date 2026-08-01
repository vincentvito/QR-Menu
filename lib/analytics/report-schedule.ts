export const ANALYTICS_REPORT_FREQUENCIES = ['off', 'daily', 'weekly'] as const

export type AnalyticsReportFrequency = (typeof ANALYTICS_REPORT_FREQUENCIES)[number]

export const ANALYTICS_REPORT_TIMEZONES = [
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Berlin',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
] as const

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export const ANALYTICS_REPORT_DELIVERY_HOUR = 9

export function isAnalyticsReportFrequency(value: unknown): value is AnalyticsReportFrequency {
  return (
    typeof value === 'string' &&
    ANALYTICS_REPORT_FREQUENCIES.includes(value as AnalyticsReportFrequency)
  )
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function getAnalyticsReportRun(
  now: Date,
  frequency: Exclude<AnalyticsReportFrequency, 'off'>,
  timeZone: string,
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? ''
  const localDate = `${part('year')}-${part('month')}-${part('day')}`
  const hour = Number(part('hour'))
  const minute = Number(part('minute'))

  // Any run at or after the delivery hour counts as due, not just the one that
  // lands exactly on it. `periodKey` already guarantees one send per period, so
  // this lets a delayed or missed cron catch up later the same local day
  // instead of dropping the period entirely.
  const isDue =
    hour >= ANALYTICS_REPORT_DELIVERY_HOUR && (frequency === 'daily' || part('weekday') === 'Mon')

  // Anchor the window to local 09:00 so a catch-up run covers exactly the range
  // the on-time run would have, instead of shifting with the invocation time.
  const untilMs =
    now.getTime() - ((hour - ANALYTICS_REPORT_DELIVERY_HOUR) * 60 + minute) * MINUTE_MS
  const until = new Date(Math.floor(untilMs / MINUTE_MS) * MINUTE_MS)
  const periodDays = frequency === 'daily' ? 1 : 7

  return {
    isDue,
    periodKey: `${frequency}:${localDate}`,
    since: new Date(until.getTime() - periodDays * DAY_MS),
    until,
  }
}

export function formatAnalyticsReportDateRange(
  since: Date,
  until: Date,
  locale: string,
  timeZone: string,
) {
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone })
  return `${formatter.format(since)} – ${formatter.format(until)}`
}
