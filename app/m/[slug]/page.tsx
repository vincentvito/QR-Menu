import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Bell } from 'lucide-react'
import { getMenuBySlug } from '@/lib/menus/get'
import { currencySymbol } from '@/lib/menus/currency'
import { BrandMark } from '@/components/brand/BrandMark'
import { PublicMenuBody } from '@/components/menu/PublicMenuBody'
import { WifiReveal } from '@/components/menu/WifiReveal'
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
  if (!menu) return { title: 'Menu not found' }
  const restaurant = menu.organization.name
  return {
    title: `${restaurant} — ${menu.name}`,
    description: `${restaurant}'s ${menu.name}, powered by QRmenucrafter.`,
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

  // Inject org colors as CSS variables on the page, overriding the global
  // accent/pop when the restaurant has picked brand colors. Defaults fall
  // through to the cream/ink palette.
  const brandStyle: Record<string, string> = {}
  if (org.primaryColor) brandStyle['--accent'] = org.primaryColor
  if (org.secondaryColor) brandStyle['--pop'] = org.secondaryColor

  const now = Date.now()
  const activeSpecialIds = menu.items
    .filter((i) => i.specialUntil && i.specialUntil.getTime() > now)
    .map((i) => i.id)

  const instaHref = org.instagramUrl ? socialUrl('instagram', org.instagramUrl) : null
  const tiktokHref = org.tiktokUrl ? socialUrl('tiktok', org.tiktokUrl) : null
  const facebookHref = org.facebookUrl ? socialUrl('facebook', org.facebookUrl) : null
  const hasSocials = Boolean(instaHref || tiktokHref || facebookHref)

  return (
    <div
      className="bg-background text-foreground min-h-screen pb-24"
      style={brandStyle as React.CSSProperties}
    >
      {/* Cover / header block */}
      <section className="bg-foreground text-background relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 h-[360px] w-[360px] rounded-full bg-accent opacity-[0.12] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-[320px] w-[320px] rounded-full bg-pop opacity-[0.18] blur-2xl"
        />
        <div className="relative mx-auto flex max-w-[720px] flex-col px-5 pt-8 pb-12 sm:px-8 sm:pt-12 sm:pb-16">
          <div className="mb-8 flex items-center justify-between gap-3">
            <BrandMark size="sm" invert />
            {org.wifiSsid ? (
              <WifiReveal
                ssid={org.wifiSsid}
                password={org.wifiPassword}
                hasPassword={org.wifiEncryption !== 'nopass'}
              />
            ) : null}
          </div>
          <div className="flex items-start gap-4">
            {org.logo ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-background/10 backdrop-blur-sm sm:size-20">
                <Image src={org.logo} alt="" fill unoptimized className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-accent text-[12px] font-medium tracking-[0.18em] uppercase">
                {menu.name}
              </p>
              <h1 className="mt-2 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[56px]">
                {org.name}
              </h1>
              <p className="text-background/70 mt-3 text-sm">
                {menu.items.length} {menu.items.length === 1 ? 'dish' : 'dishes'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicMenuBody
        symbol={symbol}
        disabledBadges={org.disabledBadges}
        specialIds={activeSpecialIds}
        items={menu.items.map((i) => ({
          id: i.id,
          category: i.category,
          name: i.name,
          description: i.description,
          price: i.price,
          tags: i.tags,
          badges: i.badges,
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
