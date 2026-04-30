import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'
import { AcceptInviteButton } from './AcceptInviteButton'

interface PageProps {
  searchParams: Promise<{ invitationId?: string }>
}

export const metadata: Metadata = {
  title: 'Accept invite',
  robots: { index: false, follow: false },
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { invitationId } = await searchParams
  if (!invitationId) return <InviteMessage title="Invitation not found" />

  // Loading the invitation, inviter, and current session in parallel.
  const [invitation, session] = await Promise.all([
    prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])

  if (!invitation) return <InviteMessage title="Invitation not found" />
  if (invitation.status !== 'pending') {
    return (
      <InviteMessage
        title="Invitation already used"
        body="This invitation has already been accepted or canceled. Ask your teammate to send a new one."
      />
    )
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <InviteMessage
        title="Invitation expired"
        body="This invitation has expired. Ask your teammate to send a new one."
      />
    )
  }

  const invitedEmail = invitation.email.toLowerCase()
  const inviterName = invitation.inviter.name || invitation.inviter.email

  // Not signed in → redirect to login with callback back here. After OTP,
  // they land on this same page with a session matching invitedEmail.
  if (!session) {
    const callback = `/accept-invite?invitationId=${invitation.id}`
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`)
  }

  const viewerEmail = session.user.email.toLowerCase()
  const emailMatches = viewerEmail === invitedEmail

  return (
    <InviteShell>
      <p className="text-muted-foreground text-sm">
        <strong className="text-foreground">{inviterName}</strong> invited you to join
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{invitation.organization.name}</h1>
      <p className="text-muted-foreground mt-1 text-xs">as {invitation.role ?? 'member'}</p>

      {emailMatches ? (
        <div className="mt-8">
          <AcceptInviteButton invitationId={invitation.id} />
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <p className="bg-background/50 border-cream-line text-muted-foreground rounded-lg border p-3 text-sm">
            This invite is for <strong className="text-foreground">{invitedEmail}</strong>, but
            you&apos;re signed in as <strong className="text-foreground">{viewerEmail}</strong>.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Sign in with a different email</Link>
          </Button>
        </div>
      )}
    </InviteShell>
  )
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="lg" />
          </Link>
        </div>
        <div className="border-cream-line bg-card rounded-2xl border p-8 text-center">
          {children}
        </div>
      </div>
    </main>
  )
}

function InviteMessage({ title, body }: { title: string; body?: string }) {
  return (
    <InviteShell>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {body ? <p className="text-muted-foreground mt-2 text-sm">{body}</p> : null}
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link href="/">Back to home</Link>
      </Button>
    </InviteShell>
  )
}
