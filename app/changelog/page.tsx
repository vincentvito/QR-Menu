import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'

const changelog = [
  {
    version: '0.4.0',
    date: '2026-04-17',
    title: 'Edit your menu + search for diners',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Owner-only menu editor at /m/[slug]/edit — inline edit every dish name, description, and price with autosave',
          'Desktop editor has a sticky left sidebar with big category buttons + icons; mobile gets horizontal category pills',
          'Search bar inside the editor filters dishes across the whole menu',
          'Add or delete dishes per category',
          'Change the restaurant name or currency from the editor header, reflected on the public page instantly',
          'Search bar at the top of every public menu — filters dishes by name, description, or tag in real time, with a no-results state',
          '"Currency" selector in the create-menu form (default USD)',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-17',
    title: 'Create your first digital menu',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Menu creation from a photo or PDF — drag a file into the dashboard and we OCR every dish with Gemini',
          'Menu creation from a restaurant URL — we scrape the page, extract every dish with Gemini, and publish a mobile-friendly menu in seconds',
          'Menu creation from pasted text for restaurants without a website',
          'Public menu page at /m/[slug] with sticky category nav, dish cards, persimmon price chips, dietary tags, and a floating call-waiter button',
          'Dashboard lists your published menus with copy-link and view-menu actions',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-17',
    title: 'Pistachio · Persimmon design system',
    changes: [
      {
        type: 'changed' as const,
        items: [
          'New Pistachio · Persimmon palette — cream paper, ink primary, pistachio-green accent, persimmon highlights',
          'Typography switched to General Sans (body) + Gambarino (italic emphasis) from Fontshare',
          'Buttons are now pill-shaped ink on cream (not orange), matching the new design',
          'Brand mark is an ink square with pistachio-green QR dots — reflected across every page',
        ],
      },
      {
        type: 'added' as const,
        items: [
          'Full landing page: hero with phone mockup and floating QR, 3-step process, big menu preview with featured dishes, animated QR scan demo, testimonial wall, 3-plan pricing, 5-question FAQ accordion, and a dark footer CTA',
          'Shared QR code and QR dot primitives for reuse in marketing and UI',
          'Kicker component for consistent section labels',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-17',
    title: 'Initial QRmenucrafter landing + OTP auth',
    changes: [
      {
        type: 'added' as const,
        items: [
          'QRmenucrafter landing page with product positioning and live phone mockup',
          'Email OTP sign-in flow with 6-digit code',
          'Branded transactional email template',
        ],
      },
      {
        type: 'changed' as const,
        items: [
          'New orange and cream design system driven by shadcn theme tokens',
          'Rebranded navigation, dashboard, and metadata to QRmenucrafter',
          'Darkened primary and muted text colors so body copy and buttons meet WCAG AA contrast',
          'Dashboard shows a clearer empty state explaining that menu creation is coming soon',
          'Hero, header, and login copy tightened for consistency ("Get started" / "Create your menu" / "See how it works")',
          'Login error messages now explain how to recover instead of just saying something went wrong',
          'Quieter hero headline (solid accent color instead of a gradient), calmer testimonial band, and a restrained phone-mockup cover',
          'Replaced the three-card features grid with a clearer 01 → 02 → 03 "how it works" narrative (Upload → Publish → Edit anytime)',
          'Consistent QRmenucrafter logo treatment across every page and a more legible dashboard header',
        ],
      },
      {
        type: 'fixed' as const,
        items: [
          'OTP code fields now announce their position and accept SMS/email autofill',
          'Sign-in errors are announced to screen readers and linked to the relevant field',
          'Language switcher exposes the active language to assistive tech',
          'Hero badge pulse respects prefers-reduced-motion',
          'Long menu item names in the landing mockup no longer break the row',
          'Prevent double-submission when sending or verifying an OTP',
          'Mobile navigation: hamburger menu surfaces previously hidden nav links',
          'Phone mockup and hero now adapt to landscape phones and short viewports',
          'Primary CTAs meet 44px touch targets on mobile',
        ],
      },
      {
        type: 'removed' as const,
        items: [
          'Legacy starter-template landing page',
          'Google OAuth and email/password sign-in (replaced by email OTP)',
          '"Pricing" and "Examples" nav links (those sections don\'t exist yet)',
          'Terms and Privacy links on the login page until those pages exist',
          'Language switcher — English only for v0.1. Translation infrastructure remains in place for when Spanish ships.',
        ],
      },
    ],
  },
]

export default async function ChangelogPage() {
  const t = await getTranslations('Changelog')
  const locale = await getLocale()

  const typeColors = {
    added: 'bg-secondary text-secondary-foreground',
    changed: 'bg-muted text-muted-foreground',
    fixed: 'bg-muted text-muted-foreground',
    removed: 'bg-destructive/10 text-destructive',
  }

  const typeLabels = {
    added: t('types.added'),
    changed: t('types.changed'),
    fixed: t('types.fixed'),
    removed: t('types.removed'),
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <nav className="border-border bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="QRmenucrafter home">
            <BrandMark size="md" />
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backHome')}
          </Link>
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl font-medium tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-4 text-lg">{t('description')}</p>
        </div>

        <div className="space-y-12">
          {changelog.map((release, index) => (
            <article key={release.version} className="border-primary/30 relative border-l-2 pl-8">
              <div className="bg-primary border-background absolute top-0 -left-3 h-6 w-6 rounded-full border-4" />

              <header className="mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-medium tracking-tight">v{release.version}</h2>
                  {index === 0 && (
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
                      {t('latest')}
                    </span>
                  )}
                </div>
                {release.title && (
                  <p className="text-foreground/80 mt-1 text-sm">{release.title}</p>
                )}
                <time className="text-muted-foreground text-sm">
                  {new Date(release.date).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </header>

              <div className="space-y-6">
                {release.changes.map((change, changeIndex) => (
                  <div key={changeIndex}>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${typeColors[change.type]}`}
                    >
                      {typeLabels[change.type]}
                    </span>
                    <ul className="mt-3 space-y-2">
                      {change.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-foreground/80 flex items-start gap-2">
                          <span className="bg-muted-foreground/50 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
