import Link from 'next/link'
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Palette,
  QrCode,
  ScanText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { QRCode } from '@/components/brand/QRCode'
import { JsonLd } from '@/components/seo/JsonLd'
import { Kicker } from '@/components/ui/kicker'
import { PillButton } from '@/components/ui/pill-button'
import { buildBreadcrumbJsonLd, buildPageMetadata, getAcquisitionRoute } from '@/lib/seo'

const route = getAcquisitionRoute('/qr-menu-from-pdf')

export const metadata = buildPageMetadata(route)
export const dynamic = 'force-static'

const guides = [
  {
    href: '/blog/pdf-menu-vs-mobile-qr-menu',
    label: 'Choose the right format',
    title: 'PDF menu or mobile menu?',
    description: 'Compare the diner experience, maintenance work, and cases where a PDF is enough.',
  },
  {
    href: '/blog/turn-menu-photo-into-digital-menu',
    label: 'Start from a photo',
    title: 'Digitize a photographed menu',
    description:
      'Capture readable source photos and review the extracted details before publishing.',
  },
  {
    href: '/blog/edit-qr-menu-without-reprinting',
    label: 'Keep the same QR',
    title: 'Update without reprinting',
    description: 'Learn which menu changes keep the table QR code working and when to replace it.',
  },
  {
    href: '/blog/qr-menu-launch-checklist',
    label: 'Before every table',
    title: 'Run the launch checklist',
    description:
      'Test menu details, real phones, public access, and the printed QR before rollout.',
  },
] as const

const faqItems = [
  {
    question: 'Does Qtable just put my PDF behind a QR code?',
    answer:
      'No. Qtable extracts menu content into editable categories and dishes for a mobile menu. You review the result before publishing.',
  },
  {
    question: 'What can I import?',
    answer:
      'The setup flow accepts PDF files, menu photos in common image formats, a website URL, or pasted menu text. You can upload up to three files in one initial import.',
  },
  {
    question: 'Will the import be perfect?',
    answer:
      'Treat the imported menu as a first draft. Check names, prices, variants, dietary details, and category order against the source before guests see it.',
  },
  {
    question: 'Can I change the menu after printing the QR code?',
    answer:
      'Yes. Menu edits publish to the same menu address, so the QR code can stay in place as long as that address remains unchanged.',
  },
] as const

export default function PdfToQrMenuPage() {
  const breadcrumbs = route.breadcrumbs ?? []

  return (
    <div className="bg-background text-foreground min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />

      <header className="bg-background/90 border-cream-line border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hidden text-sm font-medium sm:inline">
              Guides
            </Link>
            <PillButton asChild variant="primary">
              <Link href="/onboarding">
                Upload your menu
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </PillButton>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div className="bg-accent/35 pointer-events-none absolute -top-40 -right-24 h-[34rem] w-[34rem] rounded-full blur-3xl" />
          <div className="relative mx-auto max-w-[1240px]">
            <nav
              aria-label="Breadcrumb"
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              {breadcrumbs.map((breadcrumb, index) => (
                <span key={breadcrumb.path} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span aria-current="page">{breadcrumb.name}</span>
                  ) : (
                    <Link href={breadcrumb.path}>{breadcrumb.name}</Link>
                  )}
                </span>
              ))}
            </nav>

            <div className="mt-12 grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <Kicker tone="accent">PDF in. Mobile menu out.</Kicker>
                <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.045em] sm:text-6xl md:text-7xl">
                  {route.heading}
                </h1>
                <p className="text-muted-foreground mt-7 max-w-2xl text-lg leading-8">
                  Upload your restaurant menu PDF, review the extracted dishes and prices, and
                  publish a structured menu that guests can browse on a phone. It is more than a QR
                  link to the original document: the content remains editable after launch.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <PillButton asChild variant="primary" size="lg">
                    <Link href="/onboarding">
                      Upload your menu
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </PillButton>
                  <PillButton asChild variant="ghost" size="lg">
                    <Link href="/#examples">View a sample mobile menu</Link>
                  </PillButton>
                </div>
              </div>

              <div className="border-cream-line bg-card relative min-h-[430px] overflow-hidden rounded-[36px] border p-6 shadow-[0_30px_80px_-45px_rgba(26,30,23,0.5)] sm:p-9">
                <div className="bg-background border-cream-line w-[78%] rotate-[-4deg] rounded-[22px] border p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-pop h-7 w-7" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase">Source</p>
                      <p className="text-muted-foreground text-sm">restaurant-menu.pdf</p>
                    </div>
                  </div>
                  <div className="mt-7 space-y-3" aria-hidden="true">
                    {[75, 95, 64, 88, 55].map((width) => (
                      <div
                        key={width}
                        className="bg-cream-line h-2.5 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="bg-foreground text-background absolute right-5 bottom-5 w-[58%] rounded-[28px] p-5 shadow-2xl sm:right-8 sm:bottom-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-accent text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Mobile menu
                      </p>
                      <p className="mt-1 font-semibold">Dinner</p>
                    </div>
                    <div className="bg-background rounded-xl p-1.5">
                      <QRCode size={54} color="#1a1e17" bg="#f8f5ec" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="border-background/15 border-b pb-3">
                      <p>Roasted tomato salad</p>
                      <p className="text-background/60 mt-1">$12</p>
                    </div>
                    <div>
                      <p>Wild mushroom risotto</p>
                      <p className="text-background/60 mt-1">$24</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-foreground text-background px-[clamp(20px,5vw,80px)] py-16 md:py-20">
          <div className="mx-auto max-w-[1240px]">
            <Kicker tone="accent">Built for the person maintaining the menu</Kicker>
            <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <h2 className="max-w-xl text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
                Start with the document you already use.
              </h2>
              <div className="text-background/72 grid gap-5 leading-7 sm:grid-cols-2">
                <p>
                  For independent restaurants, cafés, bars, and hospitality teams that already have
                  a menu in PDF or image form.
                </p>
                <p>
                  Useful when prices and availability change, or when pinching and zooming through a
                  fixed PDF is not the guest experience you want.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div className="mx-auto max-w-[1240px]">
            <Kicker>From file to table</Kicker>
            <h2 className="mt-5 max-w-2xl text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
              A review-first workflow in four steps.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  ScanText,
                  '01',
                  'Import',
                  'Upload a PDF or menu image. A URL or pasted text also works when that is the better source.',
                ],
                [
                  ShieldCheck,
                  '02',
                  'Review',
                  'Compare every category, dish, description, price, variant, and dietary tag with the original.',
                ],
                [
                  Palette,
                  '03',
                  'Present',
                  'Choose a menu layout and add your restaurant name, colors, logo, and imagery.',
                ],
                [
                  QrCode,
                  '04',
                  'Publish',
                  'Start a trial or plan when you are ready to make the menu public, then download and test the QR code.',
                ],
              ].map(([Icon, number, title, description]) => (
                <article
                  key={String(number)}
                  className="border-cream-line bg-card rounded-[28px] border p-6"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="text-pop h-6 w-6" aria-hidden="true" />
                    <span className="text-muted-foreground text-xs font-semibold">
                      {String(number)}
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold">{String(title)}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {String(description)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card/55 border-cream-line border-y px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-2">
            <div>
              <Kicker>What comes through</Kicker>
              <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.03em]">
                Structured details you can edit.
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  'Restaurant name and menu categories',
                  'Dish names, descriptions, and prices',
                  'Multiple size or serving-price variants',
                  'Suggested dietary tags for your review',
                  'A branded, browser-based mobile menu and QR code',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="text-pop mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-cream-line bg-background rounded-[32px] border p-7 sm:p-9">
              <Smartphone className="text-pop h-8 w-8" aria-hidden="true" />
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.02em]">
                The honest limitations
              </h2>
              <div className="text-muted-foreground mt-6 space-y-4 leading-7">
                <p>
                  Import is a starting point, not an approval step. Complex layouts, faint scans,
                  unusual price formats, and ambiguous dietary notes need careful human review.
                </p>
                <p>
                  Qtable creates a browsable menu; this page does not promise online ordering, POS
                  integration, guaranteed extraction accuracy, or automatic translation of your menu
                  content.
                </p>
                <p>
                  Your menu stays in setup mode until you activate public access. Check the current{' '}
                  <Link
                    href="/#pricing"
                    className="text-foreground font-medium underline underline-offset-4"
                  >
                    pricing and plan details
                  </Link>{' '}
                  before launch.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div className="mx-auto max-w-[1240px]">
            <Kicker>Plan the whole rollout</Kicker>
            <h2 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
              Four practical guides for a menu guests can trust.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="border-cream-line bg-card group rounded-[28px] border p-6 transition-transform hover:-translate-y-1"
                >
                  <p className="text-pop text-xs font-semibold tracking-[0.14em] uppercase">
                    {guide.label}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold">{guide.title}</h3>
                  <p className="text-muted-foreground mt-3 leading-7">{guide.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                    Read the guide{' '}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-foreground text-background px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Kicker tone="accent">Questions before upload</Kicker>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em]">
                Know what happens next.
              </h2>
            </div>
            <div className="divide-background/15 divide-y">
              {faqItems.map((item) => (
                <div key={item.question} className="py-6 first:pt-0">
                  <h3 className="text-xl font-semibold">{item.question}</h3>
                  <p className="text-background/70 mt-3 leading-7">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-[clamp(20px,5vw,80px)] py-16 text-center md:py-24">
          <div className="mx-auto max-w-2xl">
            <Kicker>Ready when the source is</Kicker>
            <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
              Bring the PDF. Keep control of the menu.
            </h2>
            <p className="text-muted-foreground mt-5 leading-7">
              Import a first draft, inspect it against your original, then decide when it is ready
              for guests.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PillButton asChild variant="primary" size="lg">
                <Link href="/onboarding">
                  Upload your menu <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </PillButton>
              <PillButton asChild variant="ghost" size="lg">
                <Link href="/#pricing">Review pricing</Link>
              </PillButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-cream-line border-t px-[clamp(20px,5vw,80px)] py-8">
        <div className="text-muted-foreground mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm">
          <span>Qtable turns existing menu content into an editable mobile menu.</span>
          <div className="flex gap-5">
            <Link href="/">Home</Link>
            <Link href="/blog">Guides</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
