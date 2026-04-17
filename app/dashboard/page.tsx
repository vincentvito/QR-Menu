'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { QrCode } from 'lucide-react'
import Link from 'next/link'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BrandMark } from '@/components/brand/BrandMark'

export default function DashboardPage() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) router.push('/auth/login')
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('loading')}</div>
      </div>
    )
  }

  if (!session) return null

  const initials =
    session.user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  return (
    <div className="min-h-screen">
      <header className="border-border bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="QRmenucrafter home">
            <BrandMark size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="ring-primary/20 h-8 w-8 ring-2">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground hidden text-sm sm:block">
                {session.user.name || session.user.email}
              </span>
            </div>
            <Button
              onClick={async () => {
                await signOut()
                router.push('/auth/login')
              }}
              variant="outline"
              size="sm"
            >
              {t('signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="sr-only">
          {t('welcome', { name: session.user.name || session.user.email })}
        </h1>
        <div className="border-border bg-card flex flex-col items-center rounded-2xl border px-8 py-16 text-center shadow-sm">
          <div className="border-border bg-muted text-muted-foreground mb-5 flex h-12 w-12 items-center justify-center rounded-xl border">
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-medium tracking-tight">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">{t('emptyDescription')}</p>
        </div>
      </main>
    </div>
  )
}
