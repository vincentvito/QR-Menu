import Link from 'next/link'
import { getCachedSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { AdminTable } from '../AdminTable'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  // Layout already gated; this hits the per-request cache.
  const session = await getCachedSession()
  if (!session) return null

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
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
    prisma.user.count(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const rangeStart = totalUsers === 0 ? 0 : skip + 1
  const rangeEnd = Math.min(skip + users.length, totalUsers)

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="text-muted-foreground mt-1 mb-5 text-sm">
        {totalUsers} total · showing {rangeStart}–{rangeEnd} · impersonate to see what a user sees,
        ban to block sign-in.
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

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PageLink href={`/admin/users?page=${page - 1}`} enabled={hasPrev}>
              Previous
            </PageLink>
            <PageLink href={`/admin/users?page=${page + 1}`} enabled={hasNext}>
              Next
            </PageLink>
          </div>
        </div>
      ) : null}
    </section>
  )
}

// Renders an enabled <Link> or a disabled-looking span. Avoids the asChild +
// disabled foot-gun where the Link inside a disabled Button is still clickable.
function PageLink({
  href,
  enabled,
  children,
}: {
  href: string
  enabled: boolean
  children: React.ReactNode
}) {
  const className = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    !enabled && 'pointer-events-none opacity-50',
  )
  if (!enabled) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
