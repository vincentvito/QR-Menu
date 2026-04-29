import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCachedSession } from '@/lib/auth'
import { BrandMark } from '@/components/brand/BrandMark'
import { Kicker } from '@/components/ui/kicker'
import { LoginForm } from './LoginForm'

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[]
  }>
}

const HERO_IMAGE = '/images/auth-mobile-menu-hero.png'

function normalizeCallbackUrl(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([getCachedSession(), searchParams])
  const callbackUrl = normalizeCallbackUrl(params?.callbackUrl)

  if (session) redirect(callbackUrl)

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="bg-background text-foreground motion-safe:animate-login-shell grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]"
    >
      <section className="flex min-h-screen items-start px-[clamp(20px,6vw,72px)] py-8 lg:py-12">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-7">
          <Link href="/" aria-label="Qtable home" className="self-start">
            <BrandMark size="lg" />
          </Link>

          <div className="border-cream-line bg-foreground relative h-44 overflow-hidden rounded-[28px] border shadow-[0_18px_50px_rgba(26,30,23,0.18)] sm:h-56 lg:hidden">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 0vw"
              className="motion-safe:animate-login-image object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1e17]/55 via-transparent to-transparent" />
          </div>

          <div className="space-y-8">
            <div className="motion-safe:animate-login-copy space-y-4">
              <Kicker tone="pop">Built for busy service</Kicker>
              <div className="space-y-3">
                <h1
                  className="max-w-[12ch] font-semibold"
                  style={{
                    fontSize: 'clamp(44px, 6vw, 72px)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.035em',
                  }}
                >
                  Your menu is already on the <i className="text-pop">table.</i>
                </h1>
                <p className="text-muted-foreground max-w-md text-base leading-7">
                  Sign in to polish mobile menus, QR codes, dish photos, and restaurant settings
                  before guests scan.
                </p>
              </div>
            </div>

            <div className="motion-safe:animate-login-form">
              <LoginForm callbackUrl={callbackUrl} />
            </div>
          </div>
        </div>
      </section>

      <aside className="relative hidden min-h-screen p-4 lg:block">
        <div className="bg-foreground motion-safe:animate-login-form sticky top-4 h-[calc(100vh-2rem)] min-h-[640px] overflow-hidden rounded-[36px]">
          <Image
            src={HERO_IMAGE}
            alt="Restaurant table with QR menu tent and mobile digital menus"
            fill
            priority
            sizes="52vw"
            className="motion-safe:animate-login-image object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,30,23,0.86)_0%,rgba(26,30,23,0.36)_42%,rgba(26,30,23,0.08)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(200,224,106,0.18),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(232,85,43,0.24),transparent_30%)]" />

          <div className="absolute top-8 left-8">
            <BrandMark size="md" invert className="text-background" />
          </div>

          <div className="text-background absolute right-8 bottom-8 left-8">
            <div className="border-background/25 max-w-xl border-t pt-6">
              <Kicker tone="accent">From scan to supper</Kicker>
              <p
                className="mt-4 max-w-[760px] font-semibold"
                style={{
                  fontSize: 'clamp(42px, 5.2vw, 64px)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                Designed for restaurants that move fast and still care about <i>taste.</i>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}
