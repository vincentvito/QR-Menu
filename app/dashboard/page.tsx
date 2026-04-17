import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { QrCode } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getMenusForUser } from '@/lib/menus/get'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BrandMark } from '@/components/brand/BrandMark'
import { NewMenuForm } from '@/components/dashboard/NewMenuForm'
import { MenuList } from '@/components/dashboard/MenuList'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

export default async function DashboardPage() {
  // Session, translations, and the request headers are independent — fetch
  // them in parallel. The per-user menu list has to wait for the session.
  const [session, t] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getTranslations('Dashboard'),
  ])
  if (!session) redirect('/auth/login')

  const menus = await getMenusForUser(session.user.id)
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const initials =
    session.user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || session.user.email[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label="QRmenucrafter home">
            <BrandMark size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Avatar
              className="ring-foreground/20 h-8 w-8 ring-2"
              title={session.user.name || session.user.email}
            >
              <AvatarImage
                src={session.user.image || undefined}
                alt={session.user.name || session.user.email}
              />
              <AvatarFallback className="bg-foreground text-background text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,80px)] py-6">
        {/* Visually hidden landmark for screen readers — the form and menu
            list are the actual content, no visible welcome banner. */}
        <h1 className="sr-only">
          {t('welcome', { name: session.user.name || session.user.email })}
        </h1>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <NewMenuForm />

          {menus.length === 0 ? (
            <div className="border-cream-line bg-card flex flex-col items-center justify-center rounded-[24px] border px-8 py-16 text-center">
              <div className="border-cream-line bg-background text-muted-foreground mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border">
                <QrCode className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold tracking-[-0.02em]">{t('emptyTitle')}</h2>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                {t('emptyDescription')}
              </p>
            </div>
          ) : (
            <MenuList
              menus={menus.map((m) => ({
                id: m.id,
                slug: m.slug,
                restaurantName: m.restaurantName,
                createdAt: m.createdAt,
                itemCount: m._count.items,
              }))}
              publicBaseUrl={publicBaseUrl}
            />
          )}
        </div>
      </main>
    </div>
  )
}
