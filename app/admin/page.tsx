import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getPlatformStats, getSignupsByDay } from '@/lib/admin/stats'
import { BrandMark } from '@/components/brand/BrandMark'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { AdminTable } from './AdminTable'
import { StatsGrid } from './StatsGrid'
import { SignupsChart } from './SignupsChart'

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login?callbackUrl=/admin')
  // Don't leak /admin's existence to non-admins.
  if (session.user.role !== 'admin') notFound()

  const [users, stats, signups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        _count: { select: { members: true } },
      },
    }),
    getPlatformStats(),
    getSignupsByDay(30),
  ])

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-[clamp(20px,5vw,80px)] py-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="QRmenucrafter home">
              <BrandMark size="md" />
            </Link>
            <span className="text-muted-foreground text-xs tracking-[0.14em] uppercase">
              Platform admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
              Your dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] space-y-10 px-[clamp(20px,5vw,80px)] py-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform-wide stats at a glance.</p>
          <StatsGrid stats={stats} className="mt-5" />
          <div className="mt-5">
            <SignupsChart data={signups} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-muted-foreground mt-1 mb-5 text-sm">
            {users.length} total · impersonate to see what a user sees, ban to block sign-in.
          </p>

          <AdminTable
            viewerId={session.user.id}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              banned: u.banned,
              banReason: u.banReason,
              orgCount: u._count.members,
            }))}
          />
        </section>
      </main>
    </div>
  )
}
