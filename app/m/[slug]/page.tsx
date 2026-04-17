import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Bell } from 'lucide-react'
import { getMenuBySlug } from '@/lib/menus/get'
import { currencySymbol } from '@/lib/menus/currency'
import { BrandMark } from '@/components/brand/BrandMark'
import { PublicMenuBody } from '@/components/menu/PublicMenuBody'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)
  if (!menu) return { title: 'Menu not found' }
  return {
    title: `${menu.restaurantName} — Menu`,
    description: `${menu.restaurantName}'s menu, powered by QRmenucrafter.`,
  }
}

export default async function PublicMenuPage({ params }: PageProps) {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)
  if (!menu) notFound()

  const symbol = currencySymbol(menu.currency)

  return (
    <div className="bg-background text-foreground min-h-screen pb-24">
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
          <BrandMark size="sm" invert className="mb-8" />
          <p className="text-accent text-[12px] font-medium tracking-[0.18em] uppercase">
            Menu
          </p>
          <h1 className="mt-2 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[56px]">
            {menu.restaurantName}
          </h1>
          <p className="text-background/70 mt-3 text-sm">
            {menu.items.length} {menu.items.length === 1 ? 'dish' : 'dishes'}
          </p>
        </div>
      </section>

      <PublicMenuBody
        symbol={symbol}
        items={menu.items.map((i) => ({
          id: i.id,
          category: i.category,
          name: i.name,
          description: i.description,
          price: i.price,
          tags: i.tags,
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

      <footer className="mx-auto mt-16 max-w-[720px] px-5 pb-12 text-center text-xs sm:px-8">
        <p className="text-muted-foreground">
          Menu by{' '}
          <a href="/" className="underline-offset-4 hover:underline">
            QRmenucrafter
          </a>
        </p>
      </footer>
    </div>
  )
}
