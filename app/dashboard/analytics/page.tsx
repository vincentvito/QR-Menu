import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getDashboardContext } from '@/lib/dashboard/context'
import {
  getDailyScans,
  getKpiSummary,
  getPeakHours,
  getSocialBreakdown,
} from '@/lib/analytics/query'
import { AnalyticsDashboard } from './AnalyticsDashboard'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

// Scoped to the currently active restaurant — switching restaurants in
// the sidebar swaps which venue's analytics you see. Restaurant-level
// staff don't need this view (they shouldn't see business numbers).
export default async function AnalyticsPage({ searchParams }: PageProps) {
  const [{ restaurant, scope }, sp, t] = await Promise.all([
    getDashboardContext(),
    searchParams,
    getTranslations('Analytics'),
  ])
  if (scope === 'restaurant') redirect('/dashboard/menus')

  const range = sp.range === '30d' ? '30d' : '7d'
  const days = range === '30d' ? 30 : 7
  const since = new Date()
  since.setDate(since.getDate() - days)

  // All four queries are independent — run in parallel.
  const [kpis, daily, peak, social] = await Promise.all([
    getKpiSummary({ restaurantId: restaurant.id, since }),
    getDailyScans({ restaurantId: restaurant.id, since }),
    getPeakHours({ restaurantId: restaurant.id, since }),
    getSocialBreakdown({ restaurantId: restaurant.id, since }),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('description', { restaurant: restaurant.name })}
        </p>
      </div>
      <AnalyticsDashboard range={range} kpis={kpis} daily={daily} peak={peak} social={social} />
    </main>
  )
}
