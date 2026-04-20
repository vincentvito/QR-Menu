import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { templatePreviewMockupUrl } from '@/lib/menus/template-assets'
import { currencySymbol } from '@/lib/menus/currency'
import type { TemplateItem } from '@/components/menu/templates/types'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const { org, role } = await getDashboardContext()
  const canEdit = ['owner', 'admin'].includes(role)

  // Grab the most recent menu — used both for the QR preview (needs a real
  // slug) and the template preview (needs the items + specials to render a
  // real menu inside the mockup instead of a sample).
  const latestMenu = await prisma.menu.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { orderBy: { order: 'asc' } },
    },
  })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const previewMenu = latestMenu
    ? { url: `${baseUrl}/m/${latestMenu.slug}`, name: latestMenu.name }
    : { url: `${baseUrl}/m/sample`, name: null }

  const now = Date.now()
  const templatePreviewData = latestMenu
    ? {
        items: latestMenu.items.map(
          (i): TemplateItem => ({
            id: i.id,
            category: i.category,
            name: i.name,
            description: i.description,
            price: i.price,
            tags: i.tags,
            badges: i.badges,
            imageUrl: i.imageUrl,
          }),
        ),
        specialIds: latestMenu.items
          .filter((i) => i.specialUntil && i.specialUntil.getTime() > now)
          .map((i) => i.id),
        symbol: currencySymbol(org.currency),
      }
    : null

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit your restaurant details, brand, QR style, and default currency.
        </p>
      </div>

      <SettingsForm
        canEdit={canEdit}
        previewMenu={previewMenu}
        templatePreviewMockupUrl={templatePreviewMockupUrl()}
        templatePreviewData={templatePreviewData}
        initial={{
          name: org.name,
          description: org.description ?? '',
          logo: org.logo ?? '',
          headerImage: org.headerImage ?? '',
          sourceUrl: org.sourceUrl ?? '',
          primaryColor: org.primaryColor ?? '',
          secondaryColor: org.secondaryColor ?? '',
          currency: org.currency,
          qrDotStyle: org.qrDotStyle,
          qrCornerStyle: org.qrCornerStyle,
          qrForegroundColor: org.qrForegroundColor,
          qrBackgroundColor: org.qrBackgroundColor,
          qrCenterType: org.qrCenterType,
          qrCenterText: org.qrCenterText ?? '',
          wifiSsid: org.wifiSsid ?? '',
          wifiPassword: org.wifiPassword ?? '',
          wifiEncryption: org.wifiEncryption,
          wifiCenterType: org.wifiCenterType,
          wifiCenterText: org.wifiCenterText ?? '',
          googleReviewUrl: org.googleReviewUrl ?? '',
          instagramUrl: org.instagramUrl ?? '',
          tiktokUrl: org.tiktokUrl ?? '',
          facebookUrl: org.facebookUrl ?? '',
          templateId: org.templateId,
          theme: org.theme,
          seasonalOverlay: org.seasonalOverlay,
        }}
      />
    </main>
  )
}
