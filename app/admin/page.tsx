import { getPlatformStats, getSignupsByDay } from '@/lib/admin/stats'
import { StatsGrid } from './StatsGrid'
import { SignupsChart } from './SignupsChart'

export default async function AdminOverviewPage() {
  const [stats, signups] = await Promise.all([getPlatformStats(), getSignupsByDay(30)])

  return (
    <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="text-muted-foreground mt-1 text-sm">Platform-wide stats at a glance.</p>
      <StatsGrid stats={stats} className="mt-5" />
      <div className="mt-5">
        <SignupsChart data={signups} />
      </div>
    </main>
  )
}
