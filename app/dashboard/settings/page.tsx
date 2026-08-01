import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { templatePreviewMockupUrl } from '@/lib/menus/template-assets'
import { currencySymbol } from '@/lib/menus/currency'
import { parseCategoryIconOverrides } from '@/lib/menus/category-icon'
import { parseVariants } from '@/lib/menus/variants'
import type { TemplateItem } from '@/components/menu/templates/types'
import { SettingsForm } from './SettingsForm'
import { SettingsSideNav } from './SettingsSideNav'
import { AnalyticsReportSettings } from './AnalyticsReportSettings'
import { isAnalyticsReportFrequency } from '@/lib/analytics/report-schedule'

export default async function SettingsPage() {
  const [{ restaurant, role, scope, session }, t] = await Promise.all([
    getDashboardContext(),
    getTranslations('Settings'),
  ])
  // Restaurant-scoped staff (manager/waiter) don't touch account-level
  // settings — bounce them back to the menus they can actually work on.
  if (scope === 'restaurant') redirect('/dashboard/menus')
  const [subscriptionAccess, latestMenu, reportRecipients] = await Promise.all([
    getSubscriptionAccessState(restaurant.organizationId),
    prisma.menu.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.analyticsReportRecipient.findMany({
      where: { restaurantId: restaurant.id, disabledAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, verifiedAt: true },
    }),
  ])
  const canEdit = ['owner', 'admin'].includes(role) && !subscriptionAccess.isLapsed
  // Mirrors the server-side `canWriteRestaurant` gate the report APIs enforce.
  const canManageReports = canEdit && !restaurant.readOnly

  // Grab the most recent menu for this restaurant — used both for the QR
  // preview (needs a real slug) and the template preview (needs the items +
  // specials to render a real menu inside the mockup instead of a sample).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const previewMenu = latestMenu
    ? { url: `${baseUrl}/m/${latestMenu.slug}`, name: latestMenu.name }
    : { url: `${baseUrl}/m/sample`, name: null }

  const now = Date.now()
  const templatePreviewData = latestMenu
    ? {
        items: latestMenu.items.map((i): TemplateItem => ({
          id: i.id,
          category: i.category,
          name: i.name,
          description: i.description,
          price: i.price,
          variants: parseVariants(i.variants),
          tags: i.tags,
          badges: i.badges,
          imageUrl: i.imageUrl,
        })),
        specialIds: latestMenu.items
          .filter((i) => i.specialUntil && i.specialUntil.getTime() > now)
          .map((i) => i.id),
        symbol: currencySymbol(restaurant.currency),
        categoryIcons: parseCategoryIconOverrides(latestMenu.categoryIcons),
      }
    : null

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      {/* Left quick-nav sticks beside the form on md+; on mobile it
          collapses so the viewport stays focused on editing. */}
      <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <SettingsSideNav />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <SettingsForm
            key={restaurant.id}
            canEdit={canEdit}
            canPublish={subscriptionAccess.hasActiveSubscription}
            previewMenu={previewMenu}
            templatePreviewMockupUrl={templatePreviewMockupUrl()}
            templatePreviewData={templatePreviewData}
            initial={{
              name: restaurant.name,
              description: restaurant.description ?? '',
              logo: restaurant.logo ?? '',
              headerImage: restaurant.headerImage ?? '',
              headerTextColor: restaurant.headerTextColor ?? '',
              sourceUrl: restaurant.sourceUrl ?? '',
              primaryColor: restaurant.primaryColor ?? '',
              secondaryColor: restaurant.secondaryColor ?? '',
              currency: restaurant.currency,
              qrDotStyle: restaurant.qrDotStyle,
              qrCornerStyle: restaurant.qrCornerStyle,
              qrForegroundColor: restaurant.qrForegroundColor,
              qrBackgroundColor: restaurant.qrBackgroundColor,
              qrCenterType: restaurant.qrCenterType,
              qrCenterText: restaurant.qrCenterText ?? '',
              wifiSsid: restaurant.wifiSsid ?? '',
              wifiPassword: restaurant.wifiPassword ?? '',
              wifiEncryption: restaurant.wifiEncryption,
              wifiCenterType: restaurant.wifiCenterType,
              wifiCenterText: restaurant.wifiCenterText ?? '',
              googleReviewUrl: restaurant.googleReviewUrl ?? '',
              instagramUrl: restaurant.instagramUrl ?? '',
              tiktokUrl: restaurant.tiktokUrl ?? '',
              facebookUrl: restaurant.facebookUrl ?? '',
              templateId: restaurant.templateId,
              theme: restaurant.theme,
              seasonalOverlay: restaurant.seasonalOverlay,
              menuNameColor: restaurant.menuNameColor ?? '',
              showLogo: restaurant.showLogo,
              showRestaurantName: restaurant.showRestaurantName,
              showMenuName: restaurant.showMenuName,
              showDishCount: restaurant.showDishCount,
              showCategoryIcons: restaurant.showCategoryIcons,
              showItemImages: restaurant.showItemImages,
            }}
          />
          <AnalyticsReportSettings
            key={`analytics-reports-${restaurant.id}`}
            canManage={canManageReports}
            accountEmail={session.user.email}
            initial={{
              frequency: isAnalyticsReportFrequency(restaurant.analyticsReportFrequency)
                ? restaurant.analyticsReportFrequency
                : 'off',
              timezone: restaurant.analyticsReportTimezone,
              recipients: reportRecipients.map(({ id, email, verifiedAt }) => ({
                id,
                email,
                verified: Boolean(verifiedAt),
              })),
            }}
          />
        </div>
      </div>
    </main>
  )
}
