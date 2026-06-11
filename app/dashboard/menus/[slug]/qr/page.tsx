import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { isOrganizationPublished } from '@/lib/menus/publication'
import { TransitionLink } from '@/components/navigation/TransitionLink'
import { MenuQRPanel } from './MenuQRPanel'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function MenuQRPage({ params }: PageProps) {
  const { slug } = await params
  const [{ org, restaurant }, t] = await Promise.all([
    getDashboardContext(),
    getTranslations('MenuQR'),
  ])

  const menu = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, organizationId: true, restaurantId: true },
  })
  if (!menu || menu.organizationId !== org.id) notFound()
  if (menu.restaurantId !== restaurant.id) redirect('/dashboard/menus')

  const isPublished = await isOrganizationPublished(menu.organizationId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const publicUrl = `${baseUrl}/m/${menu.slug}`

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <TransitionLink
        href="/dashboard/menus"
        transitionType="nav-back"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        {t('backToMenus')}
      </TransitionLink>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('title', { menuName: menu.name })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('descriptionBefore')}{' '}
          <Link
            href="/dashboard/settings"
            className="text-foreground underline-offset-2 hover:underline"
          >
            {t('settingsLink')}
          </Link>
          {t('descriptionAfter')}
        </p>
      </div>

      {isPublished ? (
        <MenuQRPanel
          menuName={menu.name}
          publicUrl={publicUrl}
          qr={{
            dotStyle: restaurant.qrDotStyle,
            cornerStyle: restaurant.qrCornerStyle,
            foregroundColor: restaurant.qrForegroundColor,
            backgroundColor: restaurant.qrBackgroundColor,
            centerType: restaurant.qrCenterType,
            centerText: restaurant.qrCenterText,
            logo: restaurant.logo ?? null,
          }}
        />
      ) : (
        <section className="border-cream-line bg-card rounded-[24px] border p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">{t('publishGate.title')}</h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
            {t('publishGate.description')}
          </p>
          <Link
            href="/dashboard/billing#plan-picker"
            className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-foreground mt-5 inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t('publishGate.cta')}
          </Link>
        </section>
      )}
    </main>
  )
}
