import { Prisma } from '@/lib/generated/prisma/client'
import prisma from '@/lib/prisma'

export interface ScheduledAnalyticsReport {
  scans: number
  uniqueGuests: number
  reviewClicks: number
  wifiReveals: number
}

type AnalyticsRow = ScheduledAnalyticsReport

export async function getScheduledAnalyticsReport({
  restaurantId,
  since,
  until,
}: {
  restaurantId: string
  since: Date
  until: Date
}): Promise<ScheduledAnalyticsReport> {
  const rows = await prisma.$queryRaw<AnalyticsRow[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE "type" = 'view')::int AS "scans",
      -- Distinct sessions across every event type, matching how
      -- getKpiSummary counts unique guests on /dashboard/analytics. The email
      -- links straight to that page, so the two numbers have to agree.
      COUNT(DISTINCT "sessionId")::int AS "uniqueGuests",
      COUNT(*) FILTER (WHERE "type" = 'google_review_click')::int AS "reviewClicks",
      COUNT(*) FILTER (WHERE "type" = 'wifi_reveal')::int AS "wifiReveals"
    FROM "menu_event"
    WHERE "restaurantId" = ${restaurantId}
      AND "createdAt" >= ${since}
      AND "createdAt" < ${until}
  `)

  return rows[0] ?? { scans: 0, uniqueGuests: 0, reviewClicks: 0, wifiReveals: 0 }
}
