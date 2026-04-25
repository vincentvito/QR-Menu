import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowRight, Bell, Check, Download, Play, Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { BrandMark } from '@/components/brand/BrandMark'
import { QRCode } from '@/components/brand/QRCode'
import { Kicker } from '@/components/ui/kicker'
import { BackToTop } from '@/components/landing/BackToTop'

// ─────────────────────────────────────────────────────────────────────────
// Unsplash imagery (same set the design handoff uses).
// ─────────────────────────────────────────────────────────────────────────
const IMG = {
  bourguignon: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=75',
  risotto: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&q=75',
  tataki: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900&q=75',
  tarte: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=900&q=75',
  menu_paper: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=75',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=75',
  chef: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=75',
  plating: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=75',
  tables: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1400&q=75',
}

// Spec: max content width 1240px, horizontal padding clamp(20px, 5vw, 80px).
const SECTION = 'mx-auto max-w-[1240px] px-[clamp(20px,5vw,80px)]'
// Spec: section vertical rhythm — 64px mobile, 96px desktop.
const SECTION_Y = 'py-16 md:py-24'

export default async function LandingPage() {
  const [t, session] = await Promise.all([
    getTranslations('Landing'),
    auth.api.getSession({ headers: await headers() }),
  ])
  const year = new Date().getFullYear()
  // Destination for every "Get started / Sign in / CTA" link on the page:
  // authenticated visitors jump straight to their dashboard, anonymous
  // visitors land on /auth/login (which already has a post-login gate).
  const ctaHref = session ? '/dashboard' : '/auth/login'

  return (
    <div className="bg-background text-foreground min-h-screen">
      <a
        href="#main"
        className="bg-foreground text-background sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>

      <Nav t={t} ctaHref={ctaHref} isAuthed={Boolean(session)} />

      <main id="main">
        <Hero t={t} ctaHref={ctaHref} />
        <Process t={t} />
        <MenuPreview t={t} />
        <QrDemo t={t} ctaHref={ctaHref} />
        <LovedBy t={t} />
        <Pricing t={t} ctaHref={ctaHref} />
        <Faq t={t} />
        <FooterCta t={t} ctaHref={ctaHref} />
      </main>

      <Footer t={t} year={year} />
      <BackToTop />
    </div>
  )
}

type T = Awaited<ReturnType<typeof getTranslations<'Landing'>>>

// ─────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────
function Nav({ t, ctaHref, isAuthed }: { t: T; ctaHref: string; isAuthed: boolean }) {
  const links = [
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.examples'), href: '#examples' },
    { label: t('nav.pricing'), href: '#pricing' },
    { label: t('nav.resources'), href: '#resources' },
  ]
  // Logged-in visitors see "Dashboard"; anonymous visitors see "Get started".
  // Either way, one CTA — no separate "Sign in" link (we dropped it to keep
  // the nav clean; clicking "Get started" while signed out routes to /auth/login).
  const ctaLabel = isAuthed ? 'Dashboard' : t('nav.getStarted')

  return (
    <header className="bg-background/80 border-cream-line sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-[clamp(20px,5vw,80px)] py-4 sm:gap-9">
        <Link href="/" aria-label={t('nav.brand')}>
          <BrandMark size="md" />
        </Link>

        <nav aria-label={t('nav.menu')} className="hidden gap-6 md:ml-4 md:flex">
          {links.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <PillButton asChild variant="primary" size="default">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </PillButton>
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────
function Hero({ t, ctaHref }: { t: T; ctaHref: string }) {
  const stats = ['time', 'scans', 'app', 'restaurants'] as const

  return (
    <section className="relative overflow-hidden">
      {/* Organic blobs — pistachio left, persimmon-tinted right. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 500 500"
        className="text-accent pointer-events-none absolute top-10 -left-24 h-[500px] w-[500px] opacity-35"
      >
        <path
          d="M250,80 C360,60 440,160 430,280 C420,400 310,440 220,420 C110,400 60,290 80,200 C100,120 160,90 250,80 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 380 380"
        className="text-pop pointer-events-none absolute -right-20 -bottom-12 h-[380px] w-[380px] opacity-20"
      >
        <path
          d="M190,40 C290,60 350,170 320,260 C290,350 180,360 100,310 C30,270 30,160 80,100 C120,50 150,35 190,40 Z"
          fill="currentColor"
        />
      </svg>

      <div
        className={`${SECTION} relative grid items-center gap-10 pt-14 pb-16 md:pt-20 md:pb-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16`}
      >
        {/* Left: copy */}
        <div className="relative z-10">
          <div className="bg-card mb-7 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium">
            <span className="bg-pop h-1.5 w-1.5 rounded-full" aria-hidden="true" />
            {t('hero.badge')}
          </div>

          <h1
            className="font-semibold"
            style={{
              fontSize: 'clamp(44px, 6vw, 72px)',
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
            }}
          >
            {t('hero.h1a')}
            <br />
            {t('hero.h1b')}
            <br />
            <span className="relative inline-block">
              <i className="relative z-10">{t('hero.h1c')}</i>
              {/* Hand-drawn squiggle underline, 4px persimmon, round caps per spec */}
              <svg
                aria-hidden="true"
                viewBox="0 0 200 20"
                preserveAspectRatio="none"
                className="text-pop pointer-events-none absolute -right-2 -bottom-1 -left-2 z-0 h-4 w-[calc(100%+16px)]"
              >
                <path
                  d="M4,10 Q50,2 100,10 T196,10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-muted-foreground mt-6 max-w-[500px] text-[17px] leading-[1.55]">
            {t('hero.description')}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <PillButton asChild variant="primary" size="lg">
              <Link href={ctaHref}>
                {t('hero.ctaPrimary')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </PillButton>
            <PillButton asChild variant="ghost" size="lg">
              <Link href="#examples">
                <span className="bg-pop text-background inline-flex h-6 w-6 items-center justify-center rounded-full">
                  <Play className="h-3 w-3 translate-x-[1px] fill-current" aria-hidden="true" />
                </span>
                {t('hero.ctaSecondary')}
              </Link>
            </PillButton>
          </div>

          {/* Trust row */}
          <div className="mt-12 flex flex-wrap items-center gap-7">
            <div className="flex">
              {[IMG.chef, IMG.plating, IMG.restaurant, null].map((src, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`border-background h-8 w-8 rounded-full border-2 bg-cover bg-center ${
                    i === 0 ? '' : '-ml-2.5'
                  } ${src ? '' : 'bg-foreground'}`}
                  style={src ? { backgroundImage: `url(${src})` } : undefined}
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span className="text-pop">★★★★★</span>
                <span>{t('hero.trustStars')}</span>
              </div>
              <div className="text-muted-foreground mt-0.5 text-[13px]">{t('hero.trustLine')}</div>
            </div>
          </div>
        </div>

        <PhoneMock t={t} />
      </div>

      {/* Stat strip */}
      <div className={`${SECTION} pb-16`}>
        <div className="bg-foreground overflow-hidden rounded-[28px]">
          <div className="bg-background/[0.08] grid grid-cols-2 gap-px md:grid-cols-4">
            {stats.map((key, i) => (
              <div key={key} className="bg-foreground text-background px-[26px] py-[22px]">
                <div
                  className={`text-[32px] leading-none font-semibold tracking-[-0.03em] ${
                    i === 0 ? 'text-accent' : ''
                  }`}
                >
                  {t(`hero.stats.${key}.value` as `hero.stats.time.value`)}
                </div>
                <div className="text-background/70 mt-2 text-[13px]">
                  {t(`hero.stats.${key}.label` as `hero.stats.time.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PHONE MOCKUP
// ─────────────────────────────────────────────────────────────────────────
function PhoneMock({ t }: { t: T }) {
  const dishes = [
    { key: 'bourguignon' as const, img: IMG.bourguignon, chefsPick: true },
    { key: 'risotto' as const, img: IMG.risotto },
    { key: 'tataki' as const, img: IMG.tataki },
  ]
  const tabs = ['starters', 'mains', 'desserts', 'wine'] as const

  return (
    <div
      className="relative mx-auto flex w-full max-w-[460px] justify-center lg:justify-self-end"
      role="img"
      aria-label="Example of a published Qtable menu on a phone"
    >
      <div
        aria-hidden="true"
        className="bg-background border-foreground/15 relative z-10 w-[300px] overflow-hidden rounded-[36px] border shadow-[0_30px_60px_-30px_rgba(26,30,23,0.25)]"
      >
        {/* Status bar */}
        <div className="flex justify-between px-5 pt-3 pb-1.5 text-[11px] font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M1 8h2v1M4 6h2v3M7 4h2v5M10 2h2v7" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
              <rect x="0.5" y="0.5" width="15" height="9" rx="2" stroke="currentColor" />
              <rect x="2" y="2" width="11" height="6" rx="1" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Restaurant cover */}
        <div className="relative mx-3 mt-1.5 h-[110px] overflow-hidden rounded-[20px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${IMG.restaurant})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3.5 text-white">
            <div className="text-lg font-semibold tracking-[-0.02em]">{t('mockup.restaurant')}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] opacity-90">
              <span>{t('mockup.rating')}</span>
              <span className="opacity-60">·</span>
              <span>{t('mockup.address')}</span>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 overflow-hidden px-3 pt-3 pb-2">
          {tabs.map((tab, i) => (
            <span
              key={tab}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium whitespace-nowrap ${
                i === 1 ? 'bg-foreground text-background' : 'bg-card text-foreground'
              }`}
            >
              {t(`mockup.tabs.${tab}` as 'mockup.tabs.starters')}
            </span>
          ))}
        </div>

        {/* Dishes */}
        <div className="px-3 pt-1 pb-3">
          {dishes.map((d) => (
            <div
              key={d.key}
              className="border-cream-line bg-background mb-1.5 flex gap-2.5 rounded-[14px] border p-2.5"
            >
              <div
                className="h-[52px] w-[52px] flex-shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${d.img})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <div className="text-[13px] leading-tight font-semibold">
                    {t(`mockup.dishes.${d.key}.name` as 'mockup.dishes.bourguignon.name')}
                  </div>
                  <div className="text-[13px] font-semibold whitespace-nowrap">
                    €{t(`mockup.dishes.${d.key}.price` as 'mockup.dishes.bourguignon.price')}
                  </div>
                </div>
                {d.chefsPick && (
                  <div className="bg-accent text-accent-foreground mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                    {t('mockup.chefsPick')}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 text-[11px] leading-snug">
                  {t(`mockup.dishes.${d.key}.desc` as 'mockup.dishes.bourguignon.desc')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call waiter */}
        <div className="bg-pop text-background absolute right-3.5 bottom-3.5 grid h-10 w-10 place-items-center rounded-full shadow-[0_8px_20px_-6px_rgba(232,85,43,0.67)]">
          <Bell className="h-4 w-4" />
        </div>
      </div>

      {/* Floating QR card — tilted */}
      <div
        aria-hidden="true"
        className="bg-background border-cream-line absolute bottom-3 -left-6 z-20 w-[118px] -rotate-[7deg] rounded-[20px] border p-3 shadow-[0_20px_40px_-20px_rgba(26,30,23,0.25)]"
      >
        <QRCode size={94} />
        <div className="text-muted-foreground mt-1.5 text-center text-[10px] font-medium tracking-[0.08em]">
          {t('mockup.tableLabel')}
        </div>
      </div>

      {/* Floating price chip — tilted */}
      <div
        aria-hidden="true"
        className="bg-accent text-accent-foreground absolute top-5 -right-4 z-20 flex rotate-[6deg] items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold shadow-[0_10px_20px_-8px_rgba(26,30,23,0.2)]"
      >
        <span className="text-sm">🍷</span>
        {t('mockup.floatingChip')}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PROCESS
// ─────────────────────────────────────────────────────────────────────────
function Process({ t }: { t: T }) {
  const steps = ['upload', 'build', 'print'] as const

  return (
    <section id="how-it-works" className={SECTION_Y}>
      <div className={SECTION}>
        <div className="mb-12 text-center">
          <Kicker tone="pop">{t('process.kicker')}</Kicker>
          <h2
            className="mt-4 font-semibold whitespace-pre-line"
            style={{
              fontSize: 'clamp(36px, 4.4vw, 60px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {t('process.title')}
          </h2>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3">
          {/* Dashed connector curve between steps */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 60"
            preserveAspectRatio="none"
            className="text-foreground pointer-events-none absolute top-[90px] left-[16%] hidden h-[60px] w-[68%] opacity-25 md:block"
          >
            <path
              d="M0,30 Q150,-10 300,30 T600,30"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4 6"
            />
          </svg>

          {steps.map((key, i) => (
            <div key={key} className="bg-card relative rounded-[24px] p-7 sm:p-9">
              <div className="mb-5 flex items-center gap-3.5">
                <div className="bg-foreground text-accent grid h-12 w-12 place-items-center rounded-full text-[16px] font-semibold">
                  {t(`process.steps.${key}.n` as 'process.steps.upload.n')}
                </div>
                <StepVisual index={i} />
              </div>
              <h3 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.01em]">
                {t(`process.steps.${key}.title` as 'process.steps.upload.title')}
              </h3>
              <p className="text-muted-foreground mt-3 text-[14px] leading-[1.55]">
                {t(`process.steps.${key}.description` as 'process.steps.upload.description')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div
        aria-hidden="true"
        className="border-background ml-auto h-[50px] w-[72px] -rotate-[4deg] rounded-lg border-2 bg-cover bg-center shadow-[0_4px_12px_-4px_rgba(26,30,23,0.25)]"
        style={{ backgroundImage: `url(${IMG.menu_paper})` }}
      />
    )
  }
  if (index === 1) {
    return (
      <div aria-hidden="true" className="ml-auto flex gap-1">
        {['bg-pop', 'bg-accent', 'bg-chip'].map((c, j) => (
          <span
            key={j}
            className={`motion-safe:animate-pulse-step h-3.5 w-3.5 rounded-full ${c}`}
            style={{ animationDelay: `${j * 0.2}s` }}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      aria-hidden="true"
      className="bg-background ml-auto h-[50px] w-[50px] rounded-lg p-1.5 shadow-[0_4px_12px_-4px_rgba(26,30,23,0.16)]"
    >
      <QRCode size={40} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// MENU PREVIEW
// ─────────────────────────────────────────────────────────────────────────
function MenuPreview({ t }: { t: T }) {
  const features = ['photos', 'allergens', 'diet', 'waiter', 'analytics'] as const
  const dishes = ['bourguignon', 'risotto', 'tataki', 'tarte'] as const
  const dishImgs: Record<(typeof dishes)[number], string> = {
    bourguignon: IMG.bourguignon,
    risotto: IMG.risotto,
    tataki: IMG.tataki,
    tarte: IMG.tarte,
  }
  const categories = ['starters', 'mains', 'desserts', 'wine', 'pairings'] as const

  return (
    <section id="examples" className={`bg-card ${SECTION_Y}`}>
      <div className={SECTION}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Kicker tone="pop">{t('preview.kicker')}</Kicker>
            <h2
              className="mt-4 font-semibold whitespace-pre-line"
              style={{
                fontSize: 'clamp(32px, 3.8vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {t('preview.title')}
            </h2>
            <p className="text-muted-foreground mt-5 max-w-[400px] text-base leading-[1.55]">
              {t('preview.description')}
            </p>

            <div className="bg-background mt-7 overflow-hidden rounded-[24px]">
              {features.map((f, i) => (
                <div
                  key={f}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 text-sm sm:px-5 ${
                    i === 0 ? '' : 'border-cream-line border-t'
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <span className="bg-accent text-accent-foreground grid h-5 w-5 flex-shrink-0 place-items-center rounded-full">
                      <Check className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    {t(`preview.features.${f}.title` as 'preview.features.photos.title')}
                  </span>
                  <span className="text-muted-foreground text-right text-[13px]">
                    {t(`preview.features.${f}.meta` as 'preview.features.photos.meta')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Big menu card */}
          <div className="bg-background overflow-hidden rounded-[36px] shadow-[0_10px_30px_-12px_rgba(26,30,23,0.18)]">
            <div className="border-cream-line flex items-end justify-between gap-4 border-b px-6 py-6 sm:px-7">
              <div>
                <div className="text-muted-foreground text-[12px] font-medium tracking-[0.14em] uppercase">
                  {t('preview.menuCard.season')}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.02em] sm:text-[26px]">
                  {t('preview.menuCard.restaurant')}
                </div>
              </div>
              <div className="bg-card inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs">
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
                <span className="text-muted-foreground">{t('preview.menuCard.domain')}</span>
              </div>
            </div>

            <div className="border-cream-line no-scrollbar flex gap-2 overflow-auto border-b px-6 py-3 text-xs sm:px-7">
              {categories.map((c, i) => (
                <span
                  key={c}
                  className={`rounded-full px-3 py-1.5 font-medium whitespace-nowrap ${
                    i === 1 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(`preview.menuCard.categories.${c}` as 'preview.menuCard.categories.starters')}
                </span>
              ))}
            </div>

            <div className="bg-cream-line grid gap-px sm:grid-cols-2">
              {dishes.map((d) => {
                const tags = t.raw(
                  `preview.menuCard.dishes.${d}.tags` as 'preview.menuCard.dishes.bourguignon.tags',
                ) as string[]
                return (
                  <article
                    key={d}
                    className="bg-background hover:bg-card cursor-pointer p-5 transition-colors"
                  >
                    <div
                      className="relative h-40 overflow-hidden rounded-[20px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${dishImgs[d]})` }}
                    >
                      <div className="bg-background text-foreground absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
                        <span className="bg-pop h-1 w-1 rounded-full" />
                        {t(
                          `preview.menuCard.dishes.${d}.origin` as 'preview.menuCard.dishes.bourguignon.origin',
                        )}
                      </div>
                      <div className="bg-pop text-pop-foreground absolute right-2.5 bottom-2.5 rounded-full px-3 py-1.5 text-[15px] font-semibold">
                        €
                        {t(
                          `preview.menuCard.dishes.${d}.price` as 'preview.menuCard.dishes.bourguignon.price',
                        )}
                      </div>
                    </div>
                    <div className="mt-3.5 flex flex-col gap-2">
                      <div className="text-[22px] leading-tight font-semibold tracking-[-0.01em]">
                        {t(
                          `preview.menuCard.dishes.${d}.name` as 'preview.menuCard.dishes.bourguignon.name',
                        )}
                      </div>
                      <p className="text-muted-foreground m-0 text-[13px] leading-relaxed [text-wrap:pretty]">
                        {t(
                          `preview.menuCard.dishes.${d}.desc` as 'preview.menuCard.dishes.bourguignon.desc',
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-card text-muted-foreground rounded-[8px] px-2.5 py-0.5 text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// QR DEMO
// ─────────────────────────────────────────────────────────────────────────
function QrDemo({ t, ctaHref }: { t: T; ctaHref: string }) {
  return (
    <section className={SECTION_Y}>
      <div className={SECTION}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div className="bg-card relative grid aspect-square place-items-center overflow-hidden rounded-[36px] p-8 sm:p-10">
              <div className="bg-background rounded-[24px] p-6 shadow-[0_10px_30px_-12px_rgba(26,30,23,0.18)] sm:p-7">
                <QRCode size={260} />
                <div className="text-muted-foreground mt-4 text-center text-[13px] font-medium">
                  {t('qrDemo.scanLabel')}
                </div>
              </div>
              <div
                aria-hidden="true"
                className="motion-safe:animate-scan-line bg-pop absolute right-[20%] left-[20%] h-0.5 rounded-[2px] opacity-90 shadow-[0_0_20px_var(--pop)]"
                style={{ top: '22%' }}
              />
            </div>
          </div>

          <div>
            <Kicker tone="pop">{t('qrDemo.kicker')}</Kicker>
            <h2
              className="mt-4 font-semibold"
              style={{
                fontSize: 'clamp(32px, 3.8vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {t('qrDemo.titleA')}
              <br />
              <i className="text-pop">{t('qrDemo.titleB')}</i> {t('qrDemo.titleC')}
            </h2>
            <p className="text-muted-foreground mt-5 max-w-[440px] text-base leading-[1.55]">
              {t('qrDemo.description')}
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {(
                [
                  {
                    key: 'classic',
                    swatch: 'bg-background text-foreground border border-cream-line',
                  },
                  { key: 'accent', swatch: 'bg-accent text-accent-foreground' },
                  { key: 'bold', swatch: 'bg-pop text-background' },
                ] as const
              ).map(({ key, swatch }) => (
                <div key={key} className={`rounded-[20px] p-4 text-center ${swatch}`}>
                  <div className="mx-auto">
                    <QRCode size={90} />
                  </div>
                  <div className="mt-2 text-[11px] font-medium">
                    {t(`qrDemo.variants.${key}` as 'qrDemo.variants.classic')}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <PillButton asChild variant="primary" size="lg">
                <Link href={ctaHref}>
                  {t('qrDemo.cta')}
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LOVED BY
// ─────────────────────────────────────────────────────────────────────────
function LovedBy({ t }: { t: T }) {
  const quotes = [
    { key: 'clara' as const, img: IMG.chef },
    { key: 'thomas' as const, img: IMG.plating },
    { key: 'sara' as const, img: IMG.tables },
  ]

  return (
    <section className={`bg-card ${SECTION_Y}`}>
      <div className={SECTION}>
        <div className="mb-12 text-center">
          <Kicker tone="pop">{t('lovedBy.kicker')}</Kicker>
          <h2
            className="mt-4 font-semibold"
            style={{
              fontSize: 'clamp(32px, 3.8vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {t('lovedBy.titleA')}
            <br />
            <i className="text-pop">{t('lovedBy.titleB')}</i>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map(({ key, img }) => (
            <figure key={key} className="bg-background overflow-hidden rounded-[24px]">
              <div
                className="h-44 bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
                aria-hidden="true"
              />
              <div className="p-7">
                <div className="text-pop mb-2 text-[28px] leading-none font-semibold">“</div>
                <blockquote className="m-0 text-[15px] leading-[1.5] [text-wrap:pretty]">
                  {t(`lovedBy.quotes.${key}.quote` as 'lovedBy.quotes.clara.quote')}
                </blockquote>
                <figcaption className="border-cream-line mt-5 border-t pt-4">
                  <div className="text-sm font-semibold">
                    {t(`lovedBy.quotes.${key}.name` as 'lovedBy.quotes.clara.name')}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-[13px]">
                    {t(`lovedBy.quotes.${key}.role` as 'lovedBy.quotes.clara.role')}
                  </div>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────────────────
function Pricing({ t, ctaHref }: { t: T; ctaHref: string }) {
  const plans = ['starter', 'restaurant', 'group'] as const

  return (
    <section id="pricing" className={SECTION_Y}>
      <div className={SECTION}>
        <div className="mb-12 text-center">
          <Kicker tone="pop">{t('pricing.kicker')}</Kicker>
          <h2
            className="mt-4 font-semibold whitespace-pre-line"
            style={{
              fontSize: 'clamp(36px, 4.4vw, 60px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {t('pricing.title')}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((key, i) => {
            const featured = i === 1
            const features = t.raw(
              `pricing.plans.${key}.features` as 'pricing.plans.starter.features',
            ) as string[]
            const price = t(`pricing.plans.${key}.price` as 'pricing.plans.starter.price')

            return (
              <div
                key={key}
                className={`relative rounded-[24px] px-9 py-9 ${
                  featured
                    ? 'bg-foreground text-background -translate-y-2 shadow-[0_10px_30px_-12px_rgba(26,30,23,0.3)]'
                    : 'bg-card text-foreground'
                }`}
              >
                {featured && (
                  <div className="bg-accent text-accent-foreground absolute top-4 right-4 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.04em]">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                <div className="text-[22px] font-semibold tracking-[-0.02em]">
                  {t(`pricing.plans.${key}.name` as 'pricing.plans.starter.name')}
                </div>
                <div
                  className={`mt-1 text-[13px] ${
                    featured ? 'text-background/70' : 'text-muted-foreground'
                  }`}
                >
                  {t(`pricing.plans.${key}.tagline` as 'pricing.plans.starter.tagline')}
                </div>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[52px] leading-none font-semibold tracking-[-0.03em]">
                    {price === '0' ? 'Free' : `€${price}`}
                  </span>
                  {price !== '0' && (
                    <span
                      className={`text-sm ${
                        featured ? 'text-background/70' : 'text-muted-foreground'
                      }`}
                    >
                      {t(`pricing.plans.${key}.unit` as 'pricing.plans.starter.unit')}
                    </span>
                  )}
                </div>

                <ul className="m-0 mt-7 mb-7 list-none space-y-1.5 p-0">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full ${
                          featured
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-background text-foreground'
                        }`}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden="true" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <PillButton
                  asChild
                  variant={featured ? 'accent' : 'primary'}
                  size="lg"
                  className="w-full"
                >
                  <Link href={ctaHref}>
                    {t(`pricing.plans.${key}.cta` as 'pricing.plans.starter.cta')}
                  </Link>
                </PillButton>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────
function Faq({ t }: { t: T }) {
  const items = ['savvy', 'price', 'wifi', 'scans', 'domain'] as const

  return (
    <section id="resources" className={`bg-card ${SECTION_Y}`}>
      <div className={`${SECTION} grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-16`}>
        <div>
          <Kicker tone="pop">{t('faq.kicker')}</Kicker>
          <h2
            className="mt-4 font-semibold"
            style={{
              fontSize: 'clamp(30px, 3.6vw, 42px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {t('faq.titleA')}
            <br />
            {t('faq.titleB')}
            <br />
            <i className="text-pop">{t('faq.titleC')}</i>
          </h2>
          <p className="text-muted-foreground mt-4 text-[15px] leading-[1.55]">
            {t('faq.helpLine')}
          </p>
        </div>

        <div>
          {items.map((key, i) => (
            <details
              key={key}
              data-faq
              {...(i === 0 ? { open: true } : {})}
              className="border-cream-line bg-card mb-2 rounded-[24px] border"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-[17px] font-semibold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                <span>{t(`faq.items.${key}.q` as 'faq.items.savvy.q')}</span>
                <span
                  aria-hidden="true"
                  className="faq-icon grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </span>
              </summary>
              <div className="text-muted-foreground px-5 pb-5 text-[15px] leading-[1.55]">
                {t(`faq.items.${key}.a` as 'faq.items.savvy.a')}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FOOTER CTA
// ─────────────────────────────────────────────────────────────────────────
function FooterCta({ t, ctaHref }: { t: T; ctaHref: string }) {
  return (
    <section className="px-[clamp(20px,5vw,80px)] py-14 md:py-20">
      <div className="bg-foreground text-background relative mx-auto max-w-[1240px] overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-10 sm:py-20">
        <svg
          aria-hidden="true"
          viewBox="0 0 260 260"
          className="text-accent pointer-events-none absolute -top-16 -left-16 h-[260px] w-[260px] opacity-20"
        >
          <path
            d="M130,20 C220,30 250,130 220,190 C190,250 90,240 40,190 C-10,140 20,50 130,20 Z"
            fill="currentColor"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 280 280"
          className="text-pop pointer-events-none absolute -right-20 -bottom-16 h-[280px] w-[280px] opacity-20"
        >
          <path
            d="M140,30 C240,40 260,160 220,220 C180,280 80,270 40,210 C0,150 40,20 140,30 Z"
            fill="currentColor"
          />
        </svg>

        <div className="relative z-10">
          <Kicker tone="accent">{t('footerCta.kicker')}</Kicker>
          <h2
            className="mx-auto mt-5 max-w-[720px] font-semibold"
            style={{
              fontSize: 'clamp(42px, 5.2vw, 64px)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {t('footerCta.titleA')}
            <br />
            <i className="text-accent">{t('footerCta.titleB')}</i>
          </h2>
          <p className="text-background/75 mx-auto mt-6 max-w-[480px] text-base">
            {t('footerCta.description')}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <PillButton asChild variant="accent" size="lg">
              <Link href={ctaHref}>
                {t('footerCta.ctaPrimary')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </PillButton>
            <PillButton
              asChild
              variant="ghost"
              size="lg"
              className="border-background text-background hover:bg-background/10 hover:text-background"
            >
              <a href="mailto:hello@qtable.ai">{t('footerCta.ctaSecondary')}</a>
            </PillButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────
function Footer({ t, year }: { t: T; year: number }) {
  const columns = ['product', 'for', 'resources', 'legal'] as const

  return (
    <footer className="px-[clamp(20px,5vw,80px)] pt-5 pb-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="border-cream-line grid gap-10 border-b pb-10 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <BrandMark size="md" />
            <p className="text-muted-foreground mt-4 max-w-[320px] text-sm leading-[1.55]">
              {t('footer.tagline')}
            </p>
          </div>
          {columns.map((col) => {
            const links = t.raw(
              `footer.columns.${col}.links` as 'footer.columns.product.links',
            ) as string[]
            return (
              <div key={col}>
                <div className="text-muted-foreground mb-3.5 text-[12px] font-medium tracking-[0.14em] uppercase">
                  {t(`footer.columns.${col}.title` as 'footer.columns.product.title')}
                </div>
                <ul className="m-0 list-none p-0">
                  {links.map((l) => (
                    <li key={l} className="py-1">
                      <a href="#" className="text-[13px] transition-opacity hover:opacity-70">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <div className="text-muted-foreground flex flex-wrap justify-between gap-3 pt-5 text-xs">
          <span>{t('footer.copyright', { year })}</span>
          <span>{t('footer.madeWith')}</span>
        </div>
      </div>
    </footer>
  )
}
