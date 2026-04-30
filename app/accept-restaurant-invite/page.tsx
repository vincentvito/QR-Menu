import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'
import { AcceptRestaurantInviteButton } from './AcceptRestaurantInviteButton'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export const metadata: Metadata = {
  title: 'Accept restaurant invite',
  robots: { index: false, follow: false },
}

export default async function AcceptRestaurantInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams
  if (!token) return <InviteMessage title="Invitation not found" />

  const [invitation, session] = await Promise.all([
    prisma.restaurantInvitation.findUnique({
      where: { token },
      include: {
        restaurant: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])

  if (!invitation) return <InviteMessage title="Invitation not found" />
  if (invitation.status !== 'pending') {
    return (
      <InviteMessage
        title="Invitation already used"
        body="This invitation has already been accepted or canceled. Ask whoever invited you to send a new one."
      />
    )
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <InviteMessage
        title="Invitation expired"
        body="This invitation has expired. Ask whoever invited you to send a new one."
      />
    )
  }

  const invitedEmail = invitation.email.toLowerCase()
  const inviterName = invitation.inviter.name || invitation.inviter.email

  if (!session) {
    const callback = `/accept-restaurant-invite?token=${token}`
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`)
  }

  const viewerEmail = session.user.email.toLowerCase()
  const emailMatches = viewerEmail === invitedEmail

  return (
    <InviteShell>
      <p className="text-muted-foreground text-sm">
        <strong className="text-foreground">{inviterName}</strong> invited you to work at
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{invitation.restaurant.name}</h1>
      <p className="text-muted-foreground mt-1 text-xs">as {invitation.role}</p>

      {emailMatches ? (
        <div className="mt-8">
          <AcceptRestaurantInviteButton token={token} />
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
