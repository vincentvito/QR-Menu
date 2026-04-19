import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'QRmenucrafter — Digital menus & QR codes for restaurants',
  description:
    'Turn your printed menu into a beautiful mobile page and a QR code for your tables — edit a dish and it updates everywhere, instantly.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster
            toastOptions={{
              classNames: {
                success:
                  '!border-emerald-500/60 shadow-[0_0_0_3px_rgba(34,197,94,0.12)] [&_[data-icon]]:!text-emerald-500',
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
