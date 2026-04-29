import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { TeamPanel } from './TeamPanel'

export default async function TeamPage() {
  const { session, org, role, scope } = await getDashboardContext()
  if (scope === 'restaurant') redirect('/dashboard/menus')
  const canManage = ['owner', 'admin'].includes(role)

  // Load members + pending invitations in parallel. Role came from the
  // cached dashboard context, so no extra query for viewer membership.
  const [members, invitations] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.invitation.findMany({
      where: { organizationId: org.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1 text-sm">Who can access {org.name}.</p>
      </div>

      <TeamPanel
        canManage={canManage}
        viewerUserId={session.user.id}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
          user: m.user,
        }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role ?? 'member',
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </main>
  )
}
