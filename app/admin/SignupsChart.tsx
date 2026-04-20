'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { SignupsPoint } from '@/lib/admin/stats'

interface SignupsChartProps {
  data: SignupsPoint[]
}

const chartConfig = {
  count: {
    label: 'Signups',
    color: 'var(--foreground)',
  },
} satisfies ChartConfig

export function SignupsChart({ data }: SignupsChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="border-cream-line bg-card rounded-2xl border p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Signups · last 30 days
          </h3>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {total.toLocaleString()}
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="signups-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={formatTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={28}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={formatTooltipLabel} />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
            strokeWidth={1.75}
            fill="url(#signups-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function formatTick(date: string): string {
  // Short label like "Apr 18". The input is YYYY-MM-DD in the server's tz.
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTooltipLabel(label: unknown): string {
  if (typeof label !== 'string') return String(label)
  const d = new Date(`${label}T00:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
