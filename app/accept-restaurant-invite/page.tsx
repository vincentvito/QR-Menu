import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'
import { AcceptRestaurantInviteButton } from './AcceptRestaurantInviteButton'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Invite')
  return {
    title: t('restaurantMetadataTitle'),
    robots: { index: false, follow: false },
  }
}

export default async function AcceptRestaurantInvitePage({ searchParams }: PageProps) {
  const t = await getTranslations('Invite')
  const { token } = await searchParams
  if (!token) {
    return (
      <InviteMessage title={t('notFound')} backLabel={t('backHome')} homeAria={t('homeAria')} />
    )
  }

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

  if (!invitation) {
    return (
      <InviteMessage title={t('notFound')} backLabel={t('backHome')} homeAria={t('homeAria')} />
    )
  }
  if (invitation.status !== 'pending') {
    return (
      <InviteMessage
        title={t('alreadyUsed')}
        body={t('restaurantAlreadyUsedBody')}
        backLabel={t('backHome')}
        homeAria={t('homeAria')}
      />
    )
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <InviteMessage
        title={t('expired')}
        body={t('restaurantExpiredBody')}
        backLabel={t('backHome')}
        homeAria={t('homeAria')}
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
    <InviteShell homeAria={t('homeAria')}>
      <p className="text-muted-foreground text-sm">
        {t.rich('restaurantInviteIntro', {
          inviter: () => <strong className="text-foreground">{inviterName}</strong>,
        })}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{invitation.restaurant.name}</h1>
      <p className="text-muted-foreground mt-1 text-xs">
        {t('roleLine', { role: invitation.role })}
      </p>

      {emailMatches ? (
        <div className="mt-8">
          <AcceptRestaurantInviteButton token={token} />
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <p className="bg-background/50 border-cream-line text-muted-foreground rounded-lg border p-3 text-sm">
            {t.rich('emailMismatch', {
              invitedEmail,
              viewerEmail,
              invited: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              viewer: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">{t('differentEmail')}</Link>
          </Button>
        </div>
      )}
    </InviteShell>
  )
}

function InviteShell({ children, homeAria }: { children: React.ReactNode; homeAria: string }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label={homeAria}>
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

function InviteMessage({
  title,
  body,
  backLabel,
  homeAria,
}: {
  title: string
  body?: string
  backLabel: string
  homeAria: string
}) {
  return (
    <InviteShell homeAria={homeAria}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {body ? <p className="text-muted-foreground mt-2 text-sm">{body}</p> : null}
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link href="/">{backLabel}</Link>
      </Button>
    </InviteShell>
  )
}
