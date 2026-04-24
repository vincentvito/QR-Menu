import prisma from '@/lib/prisma'

// Aggregations for the /dashboard/analytics page. All queries are scoped
// to a single restaurant + a time window so one venue's numbers never
// leak into another's. Grouping is done in SQL-via-Prisma where cheap;
// hour-of-day bucketing happens in JS because Prisma's groupBy can't
// extract from timestamps portably.

interface RangeArgs {
  restaurantId: string
  since: Date
}

export interface KpiSummary {
  scans: number
  uniqueSessions: number
  reviewClicks: number
  wifiReveals: number
  socialClicks: number
}

export async function getKpiSummary({ restaurantId, since }: RangeArgs): Promise<KpiSummary> {
  const events = await prisma.menuEvent.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    select: { type: true, sessionId: true },
  })

  const sessions = new Set<string>()
  let scans = 0
  let reviewClicks = 0
  let wifiReveals = 0
  let socialClicks = 0

  for (const e of events) {
    sessions.add(e.sessionId)
    if (e.type === 'view') scans++
    else if (e.type === 'google_review_click') reviewClicks++
    else if (e.type === 'wifi_reveal') wifiReveals++
    else if (e.type === 'social_click') socialClicks++
  }

  return {
    scans,
    uniqueSessions: sessions.size,
    reviewClicks,
    wifiReveals,
    socialClicks,
  }
}

export interface DailyScanPoint {
  date: string // YYYY-MM-DD
  scans: number
}

// Returns one point per day in [since, now], zero-filled for days with no
// scans. Keeps the line chart continuous instead of skipping missing days.
export async function getDailyScans({
  restaurantId,
  since,
}: RangeArgs): Promise<DailyScanPoint[]> {
  const events = await prisma.menuEvent.findMany({
    where: { restaurantId, type: 'view', createdAt: { gte: since } },
    select: { createdAt: true },
  })

  const counts = new Map<string, number>()
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const points: DailyScanPoint[] = []
  const cursor = new Date(since)
  cursor.setUTCHours(0, 0, 0, 0)
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    points.push({ date: key, scans: counts.get(key) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return points
}

export interface HourlyScanPoint {
  hour: number // 0–23
  scans: number
}

export async function getPeakHours({
  restaurantId,
  since,
}: RangeArgs): Promise<HourlyScanPoint[]> {
  const events = await prisma.menuEvent.findMany({
    where: { restaurantId, type: 'view', createdAt: { gte: since } },
    select: { createdAt: true },
  })

  const buckets = new Array<number>(24).fill(0)
  for (const e of events) {
    buckets[e.createdAt.getHours()]++
  }
  return buckets.map((scans, hour) => ({ hour, scans }))
}

export interface SocialPlatformPoint {
  platform: string
  clicks: number
}

export async function getSocialBreakdown({
  restaurantId,
  since,
}: RangeArgs): Promise<SocialPlatformPoint[]> {
  const events = await prisma.menuEvent.findMany({
    where: { restaurantId, type: 'social_click', createdAt: { gte: since } },
    select: { payload: true },
  })

  const counts = new Map<string, number>()
  for (const e of events) {
    const platform =
      e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)
        ? ((e.payload as Record<string, unknown>).platform as string | undefined)
        : undefined
    if (!platform) continue
    counts.set(platform, (counts.get(platform) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([platform, clicks]) => ({ platform, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
}
