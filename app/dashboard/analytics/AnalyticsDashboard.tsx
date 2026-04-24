'use client'

import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DailyScanPoint,
  HourlyScanPoint,
  KpiSummary,
  SocialPlatformPoint,
} from '@/lib/analytics/query'

interface AnalyticsDashboardProps {
  range: '7d' | '30d'
  kpis: KpiSummary
  daily: DailyScanPoint[]
  peak: HourlyScanPoint[]
  social: SocialPlatformPoint[]
}

function formatPercent(num: number, denom: number): string {
  if (denom === 0) return '—'
  return `${((num / denom) * 100).toFixed(1)}%`
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatHour(h: number): string {
  // 12-hour labels — easier to skim at a glance than military time.
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export function AnalyticsDashboard({
  range,
  kpis,
  daily,
  peak,
  social,
}: AnalyticsDashboardProps) {
  const reviewCtr = formatPercent(kpis.reviewClicks, kpis.scans)

  return (
    <div className="space-y-6">
      {/* Range tabs — use <Link> so the server refetches aggregates.
          Tiny UX trade: one RSC round-trip on toggle; chart data is
          accurate to the second, no stale client state to reconcile. */}
      <div className="border-cream-line inline-flex rounded-full border p-0.5 text-xs">
        <Link
          href="/dashboard/analytics?range=7d"
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            range === '7d' ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          Last 7 days
        </Link>
        <Link
          href="/dashboard/analytics?range=30d"
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            range === '30d' ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          Last 30 days
        </Link>
      </div>

      {/* KPI row. Small cards, one stat each — readable without hover. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Scans" value={kpis.scans.toLocaleString()} hint="Menu page loads" />
        <Kpi
          label="Unique guests"
          value={kpis.uniqueSessions.toLocaleString()}
          hint="Distinct anonymous sessions"
        />
        <Kpi
          label="Review clicks"
          value={kpis.reviewClicks.toLocaleString()}
          hint={`${reviewCtr} of scans`}
        />
        <Kpi
          label="WiFi reveals"
          value={kpis.wifiReveals.toLocaleString()}
          hint="Guests who tapped the WiFi pill"
        />
      </div>

      {/* Scans over time */}
      <section className="border-cream-line bg-card rounded-2xl border p-5">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Scans over time
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#78716C"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis stroke="#78716C" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(v) => formatDate(v as string)}
                contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4' }}
              />
              <Line
                type="monotone"
                dataKey="scans"
                stroke="#1C1917"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Peak hours */}
        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Peak hours
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            When guests scanned your QR across the range.
          </p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peak} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  stroke="#78716C"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis stroke="#78716C" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(v) => formatHour(Number(v))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4' }}
                />
                <Bar dataKey="scans" fill="#1C1917" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Social breakdown */}
        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Social clicks
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {kpis.socialClicks.toLocaleString()} total clicks on social links.
          </p>
          {social.length === 0 ? (
            <p className="text-muted-foreground mt-8 text-center text-sm">
              No social clicks yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {social.map((row) => (
                <li
                  key={row.platform}
                  className="border-cream-line bg-background flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="capitalize">{row.platform}</span>
                  <span className="tabular-nums font-medium">{row.clicks.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-cream-line bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  )
}
