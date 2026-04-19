import prisma from '@/lib/prisma'
import { getDashboardContext } from '@/lib/dashboard/context'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const { org, role } = await getDashboardContext()
  const canEdit = ['owner', 'admin'].includes(role)

  // Grab the most recent menu so the QR preview renders against a real URL.
  // If there are no menus yet, fall back to a sample — in that case we also
  // suppress the download buttons since there's nothing real to export.
  const latestMenu = await prisma.menu.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, name: true },
  })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const previewMenu = latestMenu
    ? { url: `${baseUrl}/m/${latestMenu.slug}`, name: latestMenu.name }
    : { url: `${baseUrl}/m/sample`, name: null }

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
        initial={{
          name: org.name,
          description: org.description ?? '',
          logo: org.logo ?? '',
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
        }}
      />
    </main>
  )
}
