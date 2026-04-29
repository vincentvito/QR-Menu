import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { StaffPanel } from './StaffPanel'

export default async function StaffPage() {
  const { restaurant, role, scope } = await getDashboardContext()
  const canManage = scope === 'org' && ['owner', 'admin'].includes(role)

  const [members, invitations] = await Promise.all([
    prisma.restaurantMember.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    canManage
      ? prisma.restaurantInvitation.findMany({
          where: { restaurantId: restaurant.id, status: 'pending' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Invite managers and waiters who should be able to view and edit this restaurant&apos;s
          menus.
        </p>
      </div>

      <StaffPanel
        canManage={canManage}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
          },
        }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </main>
  )
}
