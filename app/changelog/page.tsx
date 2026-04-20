import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/BrandMark'

const changelog = [
  {
    version: '0.16.0',
    date: '2026-04-19',
    title: 'AI-assisted dish photos',
    changes: [
      {
        type: 'added' as const,
        items: [
          '&ldquo;Generate&rdquo; a dish photo with AI — uses the dish&apos;s name and description as the brief; add optional extra direction (&ldquo;overhead on slate, more steam&rdquo;) and let it cook',
          '&ldquo;Enhance&rdquo; an existing photo — improves lighting, background, and framing while preserving the exact dish and plating',
          'Review panel shows before/after so you never lose your original by accident — keep the new one, keep the old one, or try again',
          'Preview the exact prompt being sent to the AI in a collapsible section before you generate — updates live as you tweak the extra direction',
          'Generated images default to bright, overhead, Instagram-food-blog styling tuned for restaurant menus',
        ],
      },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-04-19',
    title: 'Dish photos',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Upload a photo for any dish in the editor — drag-drop or click, JPG/PNG/WEBP up to 5 MB',
          'Photos render as a thumbnail next to each dish on your public menu, giving guests a taste at a glance',
          'Tap a dish thumbnail to open it in a full-screen viewer — close with the button below, a tap outside, or Escape',
          'Remove a photo anytime with the × button on the editor thumbnail',
        ],
      },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-04-19',
    title: 'Today&apos;s Specials',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Mark any dish as Today&apos;s Special with a single tap in the editor — expires automatically at midnight, no unchecking needed',
          'Specials appear as a pinned section at the top of your public menu with a distinct treatment so guests see them first',
          'A &ldquo;Today&apos;s Specials&rdquo; pill in the menu&apos;s category nav jumps straight to that section',
        ],
      },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-04-19',
    title: 'Editorial badges',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Tag dishes with editorial badges in the editor — Best Seller, Chef&apos;s Pick, Signature, New, and Spicy — each with their own icon and color',
          'Badges render as prominent pills above the dish name on your public menu, so customers spot your highlights instantly',
          'New Badges section in Settings lets you disable the ones you don&apos;t use, keeping the editor tidy',
        ],
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-04-19',
    title: 'Google review button + social links',
    changes: [
      {
        type: 'added' as const,
        items: [
          'New Links section in Settings — add your Google review URL plus Instagram, TikTok, and Facebook profiles',
          '&ldquo;Leave us a Google review&rdquo; button in your public menu footer when a review link is set',
          'Social follow icons (Instagram, TikTok, Facebook) show up in the footer — only the ones you&apos;ve filled in',
        ],
      },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-04-19',
    title: 'WiFi password on your menu',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Add your restaurant WiFi in Settings — network name, password, and security type (WPA, WEP, or open)',
          'Guests see a &quot;WiFi&quot; button in your public menu header — tap to reveal the password, tap again to copy it',
          'Download a WiFi QR code from Settings (SVG or PNG) — print it on table cards so modern phones auto-join just by pointing the camera',
        ],
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-04-18',
    title: 'Logo uploads, sidebar nav, profile',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Upload your restaurant logo with drag-and-drop instead of pasting a URL — PNG, JPG, WEBP, or SVG up to 2 MB. Works from Settings and from onboarding',
          'Pick what goes in the middle of your QR code: your logo, custom text (up to 4 characters), or leave it blank',
          '&quot;Use restaurant brand colors&quot; one-click button in the QR section — pulls your primary/secondary colors straight into the code',
          'Download your most recent menu&apos;s QR straight from the Settings preview — SVG or PNG',
          'New left sidebar for the dashboard — your restaurant at the top, Menus/Team/Settings tabs below, your account card at the bottom. Collapses to icons with ⌘B / Ctrl+B',
          'New Profile page at /dashboard/profile — set a display name so you don&apos;t show up to teammates as your email',
          'Onboarding now asks for your name so it&apos;s filled in from day one',
          'Floating back-to-top button on the landing page',
        ],
      },
      {
        type: 'changed' as const,
        items: [
          'Landing page top nav simplified — one &quot;Get started&quot; button that takes you to the dashboard when you&apos;re already signed in',
          'Every CTA on the landing page (Start for free, Get started, Choose plan) routes you straight to your dashboard if you&apos;re signed in, instead of bouncing through the login screen',
          'Dashboard pages now share the same width and padding so navigating between Menus, Team, Settings, and Profile doesn&apos;t jump horizontally',
          'Color pickers are now circular to match the rest of the rounded UI',
        ],
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-04-18',
    title: 'Customizable QR codes',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Every menu now has a real, downloadable QR code at /dashboard/menus/[slug]/qr — SVG for print, PNG for sharing',
          'Customize your QR&apos;s dot style, corner style, and colors in Settings — updates apply across every menu',
          'If you&apos;ve set a restaurant logo, it&apos;s automatically placed in the center of your QR',
          '&quot;QR&quot; action on each row of the menu list opens the downloadable code for that menu',
        ],
      },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-18',
    title: 'Team + invitations',
    changes: [
      {
        type: 'added' as const,
        items: [
          'New Team page at /dashboard/team — see who has access to your restaurant and invite more teammates',
          'Invite employees by email — they receive a branded invitation email and can accept with a single click',
          'Two roles when inviting: Admin (can edit menus + settings + invite others) or Member (can edit menus)',
          'Pending invitations are listed with their expiry and can be canceled before they&apos;re accepted',
          'Accept-invite page at /accept-invite — shows who invited you and which restaurant, and signs you in if needed',
        ],
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-18',
    title: 'Restaurant settings',
    changes: [
      {
        type: 'added' as const,
        items: [
          'New Settings page at /dashboard/settings — edit your restaurant name, description, website, logo, brand colors, and default currency any time',
          'Changes to brand colors and logo show up on your public menu page immediately',
          'Settings tab in the dashboard nav',
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-18',
    title: 'Menus under your restaurant',
    changes: [
      {
        type: 'changed' as const,
        items: [
          'Menus now belong to your restaurant, not to a single user — every teammate on the account sees and can edit the same menus',
          'Menu creation now asks for a menu name (e.g. Dinner, Brunch, Cocktails) instead of the restaurant name — the restaurant name comes from onboarding',
          'Currency is set once on the restaurant and every menu inherits it — no more picking currency on every new menu',
          'Public menu page now shows your restaurant logo and applies your brand colors if you set them during onboarding',
        ],
      },
      {
        type: 'removed' as const,
        items: [
          'Per-menu currency override and per-menu restaurant name — moved to restaurant-level settings',
        ],
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-18',
    title: 'Restaurant onboarding + dashboard',
    changes: [
      {
        type: 'added' as const,
        items: [
          'New restaurants go through a quick onboarding flow after sign-up — paste your website and we auto-fill your name, description, logo, and brand colors from the page',
          'Skip-to-manual option if you don&apos;t have a website yet',
          'Set a default currency for your restaurant so every new menu inherits it',
          'Dashboard now has a top nav with your restaurant name + logo so you always know which restaurant you&apos;re managing',
          'Menus moved to their own page at /dashboard/menus; creating a menu is now a dedicated /dashboard/menus/new page',
        ],
      },
    ],
  },
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
