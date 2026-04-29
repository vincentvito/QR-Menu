import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { TransitionLink } from '@/components/navigation/TransitionLink'
import { MenuQRPanel } from './MenuQRPanel'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function MenuQRPage({ params }: PageProps) {
  const { slug } = await params
  const { org, restaurant } = await getDashboardContext()

  const menu = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, organizationId: true, restaurantId: true },
  })
  if (!menu || menu.organizationId !== org.id) notFound()
  // Scope to the active restaurant — switching restaurants should bounce
  // back to the list rather than keep a stale menu URL open.
  if (menu.restaurantId !== restaurant.id) redirect('/dashboard/menus')

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
        Back to menus
      </TransitionLink>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">QR code · {menu.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Download as SVG (scales infinitely) or PNG (for quick sharing). Customize the style in{' '}
          <Link
            href="/dashboard/settings"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Settings
          </Link>
          .
        </p>
      </div>

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
    </main>
  )
}
