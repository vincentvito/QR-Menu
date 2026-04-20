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
import { getTheme } from '@/lib/menus/themes'
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  TikTokIcon,
} from '@/components/brand/SocialIcons'
import { socialUrl } from '@/lib/socials'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)
  if (!menu) return { title: 'Menu not found', robots: { index: false, follow: false } }
  const restaurant = menu.organization.name
  const description =
    menu.organization.description?.trim() ||
    `${menu.name} at ${restaurant}. Browse every dish — photos, prices, specials, and dietary info.`
  const canonical = `/m/${slug}`
  return {
    title: `${restaurant} — ${menu.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `${restaurant} — ${menu.name}`,
      description,
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${restaurant} — ${menu.name}`,
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

  const org = menu.organization
  const symbol = currencySymbol(org.currency)

  // Compose the page style: theme palette + heading font + the org's brand
  // color overrides (primaryColor/secondaryColor, if set, win over the
  // theme's accent/pop). Templates read all of these via CSS vars so no
  // theme code lives in the templates themselves.
  const theme = getTheme(org.theme)
  const brandStyle = buildInlineStyle(theme, org.primaryColor, org.secondaryColor)

  const now = Date.now()
  const activeSpecialIds = menu.items
    .filter((i) => i.specialUntil && i.specialUntil.getTime() > now)
    .map((i) => i.id)

  const instaHref = org.instagramUrl ? socialUrl('instagram', org.instagramUrl) : null
  const tiktokHref = org.tiktokUrl ? socialUrl('tiktok', org.tiktokUrl) : null
  const facebookHref = org.facebookUrl ? socialUrl('facebook', org.facebookUrl) : null
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
    name: org.name,
    description: org.description ?? undefined,
    image: org.logo ?? undefined,
    url: org.sourceUrl ?? undefined,
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
                  priceCurrency: org.currency,
                }
              : undefined,
        })),
      })),
    },
  }

  return (
    <div
      data-theme={theme.id}
      className="bg-background text-foreground min-h-screen pb-24"
      style={brandStyle as React.CSSProperties}
    >
      {/* Structured data for search engines — Restaurant + Menu + MenuItem */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SeasonalOverlay id={org.seasonalOverlay} scope="viewport" />
      {/* Cover / header block — falls back to the brand-color gradient when
          no header image is set. With an image, we keep a dark gradient
          overlay so the restaurant name stays readable on any photo. */}
      <section className="bg-foreground text-background relative overflow-hidden">
        {org.headerImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={org.headerImage}
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
              className="pointer-events-none absolute -top-24 -right-16 h-[360px] w-[360px] rounded-full bg-accent opacity-[0.12] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-16 h-[320px] w-[320px] rounded-full bg-pop opacity-[0.18] blur-2xl"
            />
          </>
        )}
        <div className="relative mx-auto flex max-w-[720px] flex-col px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-12">
          {org.wifiSsid ? (
            <div className="mb-6 flex justify-end">
              <WifiReveal
                ssid={org.wifiSsid}
                password={org.wifiPassword}
                hasPassword={org.wifiEncryption !== 'nopass'}
              />
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            {org.logo ? (
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-background/10 backdrop-blur-sm sm:size-16">
                <Image src={org.logo} alt="" fill unoptimized className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-accent text-[11px] font-medium tracking-[0.18em] uppercase">
                {menu.name}
              </p>
              <h1
                className="mt-1.5 text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[40px]"
                style={org.headerTextColor ? { color: org.headerTextColor } : undefined}
              >
                {org.name}
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
        templateId={org.templateId}
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

      {/* Floating "call server" */}
      <button
        type="button"
        aria-label="Call server"
        className="bg-pop text-background fixed right-5 bottom-5 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_12px_24px_-8px_rgba(232,85,43,0.6)] transition-transform hover:scale-105 active:scale-95"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      <footer className="mx-auto mt-8 max-w-[720px] px-5 pb-12 sm:px-8">
        {org.googleReviewUrl ? (
          <div className="mb-6 flex justify-center">
            <a
              href={org.googleReviewUrl}
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
