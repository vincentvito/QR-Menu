import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const SITE_NAME = 'QRmenucrafter'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const DEFAULT_TITLE = 'QRmenucrafter — Digital menus & QR codes for restaurants'
const DEFAULT_DESCRIPTION =
  'Turn your printed menu into a beautiful mobile page and a QR code for your tables — edit a dish and it updates everywhere, instantly.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'digital menu',
    'qr menu',
    'qr code menu',
    'restaurant menu',
    'mobile menu',
    'menu maker',
    'restaurant software',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F2E7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1E17' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Instrument+Serif:ital@0;1&family=Unbounded:wght@500;600;700&display=swap"
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
