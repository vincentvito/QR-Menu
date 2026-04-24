import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Bell } from 'lucide-react'
import { getMenuBySlug } from '@/lib/menus/get'
import { currencySymbol } from '@/lib/menus/currency'
import { PublicMenuBody } from '@/components/menu/PublicMenuBody'
import { WifiReveal } from '@/components/menu/WifiReveal'
import { SeasonalOverlay } from '@/components/menu/SeasonalOverlay'
import { buildInlineStyle } from '@/components/menu/ThemeStyles'
import { getTemplate } from '@/components/menu/templates'
import { getTheme } from '@/lib/menus/themes'
import { FacebookIcon, GoogleIcon, InstagramIcon, TikTokIcon } from '@/components/brand/SocialIcons'
import { socialUrl } from '@/lib/socials'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)
  if (!menu || !menu.restaurant) {
    return { title: 'Menu not found', robots: { index: false, follow: false } }
  }
  const restaurant = menu.restaurant
  const venueName = restaurant.name
  const description =
    restaurant.description?.trim() ||
    `${menu.name} at ${venueName}. Browse every dish — photos, prices, specials, and dietary info.`
  const canonical = `/m/${slug}`
  return {
    title: `${venueName} — ${menu.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `${venueName} — ${menu.name}`,
      description,
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${venueName} — ${menu.name}`,
      description,
    },
  }
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="border-cream-line bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex size-10 items-center justify-center rounded-full border transition-colors"
    >
      {children}
    </a>
  )
}

export default async function PublicMenuPage({ params }: PageProps) {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)
  if (!menu) notFound()

  // `restaurant` is the source of truth for branding/template/wifi/socials.
  // Fallback to `organization` is defensive — every menu has a restaurant
  // after the phase-1 backfill, but we keep the fallback so a rogue menu
  // can still render instead of crashing.
  if (!menu.restaurant) notFound()
  const restaurant = menu.restaurant
  const org = menu.organization
  const symbol = currencySymbol(restaurant.currency)

  // Compose the page style: theme palette + heading font + the restaurant's
  // brand color overrides (primaryColor/secondaryColor, if set, win over the
  // theme's accent/pop). Templates read all of these via CSS vars so no
  // theme code lives in the templates themselves.
  const theme = getTheme(restaurant.theme)
  const brandStyle = buildInlineStyle(theme, restaurant.primaryColor, restaurant.secondaryColor)
  // Templates that own a fixed bottom chrome (e.g. category-tiles) need
  // extra room at the end of the page so the footer doesn't hide under
  // it. pb-40 ≈ the chrome's height + breathing room.
  const template = getTemplate(restaurant.templateId)
  const pageBottomPadding = template.chrome === 'bottom' ? 'pb-40' : 'pb-24'

  const now = Date.now()
  const activeSpecialIds = menu.items
    .filter((i) => i.specialUntil && i.specialUntil.getTime() > now)
    .map((i) => i.id)

  const logo = restaurant.logo
  const instaHref = restaurant.instagramUrl ? socialUrl('instagram', restaurant.instagramUrl) : null
  const tiktokHref = restaurant.tiktokUrl ? socialUrl('tiktok', restaurant.tiktokUrl) : null
  const facebookHref = restaurant.facebookUrl ? socialUrl('facebook', restaurant.facebookUrl) : null
  const hasSocials = Boolean(instaHref || tiktokHref || facebookHref)

  // Group items by category for the schema.org hasMenuSection nesting.
  const sectionMap = new Map<string, typeof menu.items>()
  for (const item of menu.items) {
    const key = item.category || 'Other'
    const bucket = sectionMap.get(key) ?? []
    bucket.push(item)
    sectionMap.set(key, bucket)
  }

  // Restaurant + Menu structured data. Google uses this to understand the
  // page is a restaurant menu — enables richer search results and helps
  // discoverability for dish-level queries.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description ?? undefined,
    image: logo ?? undefined,
    url: restaurant.sourceUrl ?? undefined,
    hasMenu: {
      '@type': 'Menu',
      name: menu.name,
      hasMenuSection: Array.from(sectionMap.entries()).map(([sectionName, items]) => ({
        '@type': 'MenuSection',
        name: sectionName,
        hasMenuItem: items.map((i) => ({
          '@type': 'MenuItem',
          name: i.name,
          description: i.description || undefined,
          image: i.imageUrl ?? undefined,
          offers:
            i.price > 0
              ? {
                  '@type': 'Offer',
                  price: i.price,
                  priceCurrency: restaurant.currency,
                }
              : undefined,
        })),
      })),
    },
  }

  return (
    <div
      data-theme={theme.id}
      className={`bg-background text-foreground min-h-screen ${pageBottomPadding}`}
      style={brandStyle as React.CSSProperties}
    >
      {/* Structured data for search engines — Restaurant + Menu + MenuItem */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SeasonalOverlay id={restaurant.seasonalOverlay} scope="viewport" />
      {/* Cover / header block — falls back to the brand-color gradient when
          no header image is set. With an image, we keep a dark gradient
          overlay so the restaurant name stays readable on any photo. */}
      <section className="bg-foreground text-background relative overflow-hidden">
        {restaurant.headerImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.headerImage}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            {/* Dark overlay keeps "restaurant name" white-on-bright
                readable — bottom-weighted so faces/food at top of the
                image aren't muddied. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.30) 100%)',
              }}
            />
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="bg-accent pointer-events-none absolute -top-24 -right-16 h-[360px] w-[360px] rounded-full opacity-[0.12] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="bg-pop pointer-events-none absolute -bottom-24 -left-16 h-[320px] w-[320px] rounded-full opacity-[0.18] blur-2xl"
            />
          </>
        )}
        <div className="relative mx-auto flex max-w-[720px] flex-col px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-12">
          {restaurant.wifiSsid ? (
            <div className="mb-6 flex justify-end">
              <WifiReveal
                ssid={restaurant.wifiSsid}
                password={restaurant.wifiPassword}
                hasPassword={restaurant.wifiEncryption !== 'nopass'}
              />
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            {logo ? (
              <div className="bg-background/10 relative size-12 shrink-0 overflow-hidden rounded-xl backdrop-blur-sm sm:size-16">
                <Image src={logo} alt="" fill unoptimized className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-accent text-[11px] font-medium tracking-[0.18em] uppercase">
                {menu.name}
              </p>
              <h1
                className="mt-1.5 text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[40px]"
                style={restaurant.headerTextColor ? { color: restaurant.headerTextColor } : undefined}
              >
                {restaurant.name}
              </h1>
              <p className="text-background/70 mt-2 text-xs sm:text-sm">
                {menu.items.length} {menu.items.length === 1 ? 'dish' : 'dishes'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicMenuBody
        symbol={symbol}
        specialIds={activeSpecialIds}
        templateId={restaurant.templateId}
        items={menu.items.map((i) => ({
          id: i.id,
          category: i.category,
          name: i.name,
          description: i.description,
          price: i.price,
          tags: i.tags,
          badges: i.badges,
          imageUrl: i.imageUrl,
        }))}
      />

      {/* Floating "call server". Lifted above the sticky bottom chrome
          on templates that own one (category-tiles) so the bell is
          never trapped under the search/pills bar. */}
      <button
        type="button"
        aria-label="Call server"
        className={`bg-pop text-background fixed right-5 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_12px_24px_-8px_rgba(232,85,43,0.6)] transition-transform hover:scale-105 active:scale-95 ${
          template.chrome === 'bottom' ? 'bottom-36' : 'bottom-5'
        }`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      <footer className="mx-auto mt-8 max-w-[720px] px-5 pb-12 sm:px-8">
        {restaurant.googleReviewUrl ? (
          <div className="mb-6 flex justify-center">
            <a
              href={restaurant.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-cream-line bg-card hover:bg-foreground hover:text-background inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors"
            >
              <GoogleIcon className="size-4" aria-hidden={true} />
              Leave us a Google review
            </a>
          </div>
        ) : null}

        {hasSocials && (
          <div className="mb-6 flex justify-center gap-3">
            {instaHref ? (
              <SocialLink href={instaHref} label="Instagram">
                <InstagramIcon className="size-4" aria-hidden={true} />
              </SocialLink>
            ) : null}
            {tiktokHref ? (
              <SocialLink href={tiktokHref} label="TikTok">
                <TikTokIcon className="size-4" aria-hidden={true} />
              </SocialLink>
            ) : null}
            {facebookHref ? (
              <SocialLink href={facebookHref} label="Facebook">
                <FacebookIcon className="size-4" aria-hidden={true} />
              </SocialLink>
            ) : null}
          </div>
        )}

        <p className="text-muted-foreground text-center text-xs">
          Menu by{' '}
          <a href="/" className="underline-offset-4 hover:underline">
            QRmenucrafter
          </a>
        </p>
      </footer>
    </div>
  )
}
