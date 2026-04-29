import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { getCachedSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { resolvePlan } from '@/lib/plans'
import { buttonVariants } from '@/components/ui/button'
import { AdminTable } from '../AdminTable'

interface PageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  // Layout already gated; this hits the per-request cache.
  const session = await getCachedSession()
  if (!session) return null

  const { email: emailParam } = await searchParams
  const emailQuery = (emailParam ?? '').trim()
  const hasQuery = emailQuery.length > 0

  const user = hasQuery
    ? await prisma.user.findFirst({
        where: {
          email: {
            equals: emailQuery,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          banned: true,
          banReason: true,
          members: {
            select: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  compPlan: true,
                  compReason: true,
                  compGrantedAt: true,
                  maxRestaurantsOverride: true,
                  monthlyCreditsOverride: true,
                  monthlyCreditsRemaining: true,
                  bonusCreditsRemaining: true,
                  _count: { select: { restaurants: true, menus: true } },
                },
              },
            },
          },
        },
      })
    : null
  const users = user ? [user] : []

  const orgIds = Array.from(
    new Set(users.flatMap((user) => user.members.map((member) => member.organization.id))),
  )
  const subscriptions =
    orgIds.length > 0
      ? await prisma.subscription.findMany({
          where: { referenceId: { in: orgIds } },
          orderBy: { updatedAt: 'desc' },
          select: {
            referenceId: true,
            plan: true,
            status: true,
            billingInterval: true,
            updatedAt: true,
          },
        })
      : []
  const latestSubscriptionByOrg = new Map<string, (typeof subscriptions)[number]>()
  const activeSubscriptionByOrg = new Map<string, (typeof subscriptions)[number]>()
  for (const subscription of subscriptions) {
    if (!latestSubscriptionByOrg.has(subscription.referenceId)) {
      latestSubscriptionByOrg.set(subscription.referenceId, subscription)
    }
    if (
      !activeSubscriptionByOrg.has(subscription.referenceId) &&
      ['trialing', 'active', 'past_due'].includes(subscription.status)
    ) {
      activeSubscriptionByOrg.set(subscription.referenceId, subscription)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Search by email to impersonate users, review organizations, and manage access.
      </p>

      <form
        action="/admin/users"
        className="border-cream-line bg-card mt-5 mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
      >
        <label className="sr-only" htmlFor="admin-user-email-search">
          Search users by email
        </label>
        <div className="border-cream-line bg-background focus-within:ring-ring/20 flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-2 focus-within:ring-2">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <input
            id="admin-user-email-search"
            name="email"
            type="search"
            inputMode="email"
            autoComplete="email"
            defaultValue={emailQuery}
            placeholder="user@example.com"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonVariants({ size: 'sm' })}>
            Search
          </button>
          {hasQuery ? (
            <Link
              href="/admin/users"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {hasQuery ? (
        <>
          <p className="text-muted-foreground mb-5 text-sm">
            {user
              ? `Showing the account for "${user.email}".`
              : `No account found for "${emailQuery}".`}
            {user ? ' Impersonate to see what the user sees, ban to block sign-in.' : ''}
          </p>

          {users.length > 0 ? (
            <AdminTable
              viewerId={session.user.id}
              users={users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                banned: u.banned,
                banReason: u.banReason,
                organizations: u.members.map((member) => {
                  const organization = member.organization
                  const activeSubscription = activeSubscriptionByOrg.get(organization.id) ?? null
                  const latestSubscription = latestSubscriptionByOrg.get(organization.id) ?? null
                  const plan = resolvePlan(activeSubscription, organization)
                  return {
                    id: organization.id,
                    name: organization.name,
                    compPlan: organization.compPlan,
                    compReason: organization.compReason,
                    compGrantedAt: organization.compGrantedAt,
                    monthlyCreditsRemaining: organization.monthlyCreditsRemaining,
                    bonusCreditsRemaining: organization.bonusCreditsRemaining,
                    restaurantCount: organization._count.restaurants,
                    menuCount: organization._count.menus,
                    planName: plan.name,
                    subscriptionStatus: latestSubscription?.status ?? null,
                    subscriptionPlan: latestSubscription?.plan ?? null,
                    billingInterval: latestSubscription?.billingInterval ?? null,
                  }
                }),
              }))}
            />
          ) : (
            <div className="border-cream-line bg-card rounded-2xl border p-8 text-center">
              <h2 className="font-semibold tracking-tight">No matching users</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Check the spelling and search the full email address.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="border-cream-line bg-card rounded-2xl border p-8 text-center">
          <h2 className="font-semibold tracking-tight">Search for a user</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter the full email address to load one account.
          </p>
        </div>
      )}
    </main>
  )
}
