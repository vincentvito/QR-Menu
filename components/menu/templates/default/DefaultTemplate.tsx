import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { DietaryTagPills } from '@/components/menu/DietaryTagPills'
import { PriceChip } from '@/components/menu/PriceChip'
import { VariantPriceChips } from '@/components/menu/VariantPriceChips'
import { cn } from '@/lib/utils'
import type {
  TemplateBodyProps,
  TemplateDef,
  TemplateItem,
} from '@/components/menu/templates/types'

// Default template: text-first list with a small square photo thumbnail on
// the left when the dish has one. The original Qtable look.

function DefaultBody({
  groups,
  specials,
  specialsAnchorId,
  symbol,
  onOpenImage,
  preview,
}: TemplateBodyProps) {
  const t = useTranslations('MenuView')

  return (
    <>
      {specials.length > 0 && (
        <section
          id={specialsAnchorId}
          className="border-pop/50 bg-pop/10 mt-6 scroll-mt-40 rounded-[20px] border p-6 sm:p-8"
          style={{
            // Theme-aware glow: the halo picks up whichever --pop the
            // active theme sets, so the specials section pops in its own
            // palette rather than always being persimmon.
            boxShadow:
              '0 0 36px -4px color-mix(in oklab, var(--pop) 35%, transparent), 0 6px 18px -10px rgba(0,0,0,0.15)',
          }}
        >
          <h2 className="bg-pop text-pop-foreground mb-5 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
            {t('todaysSpecials')}
          </h2>
          <ul className="space-y-6">
            {specials.map((item) => (
              <DefaultDishCard
                key={item.id}
                item={item}
                symbol={symbol}
                onOpenImage={onOpenImage}
                preview={preview}
              />
            ))}
          </ul>
        </section>
      )}
      {groups.map((g, index) => (
        <section
          key={g.id}
          id={g.id}
          className={cn(
            'border-cream-line scroll-mt-40 border-b py-8 last:border-b-0 sm:py-10',
            preview && specials.length === 0 && index === 0 && 'pt-0 sm:pt-0',
          )}
        >
          <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            {g.category}
          </h2>
          <ul className="mt-5 space-y-6">
            {g.items.map((item) => (
              <DefaultDishCard
                key={item.id}
                item={item}
                symbol={symbol}
                onOpenImage={onOpenImage}
                preview={preview}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

interface DishCardProps {
  item: TemplateItem
  symbol: string
  onOpenImage: (src: string) => void
  preview?: boolean
}

const DefaultDishCard = memo(function DefaultDishCard({
  item,
  symbol,
  onOpenImage,
  preview,
}: DishCardProps) {
  const t = useTranslations('MenuView')
  const imageUrl = item.imageUrl
  return (
    <li className="flex gap-4">
      {imageUrl ? (
        preview ? (
          <div className="border-cream-line bg-card size-[84px] shrink-0 overflow-hidden rounded-[14px] border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <button
            type="button"
            aria-label={t('openPhotoAria', { item: item.name })}
            onClick={() => onOpenImage(imageUrl)}
            className="border-cream-line bg-card focus-visible:ring-foreground size-[84px] shrink-0 overflow-hidden rounded-[14px] border transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </button>
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <BadgeRow badges={item.badges} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h3 className="min-w-0 text-[17px] leading-tight font-semibold tracking-[-0.01em]">
            {item.name}
          </h3>
          {item.variants.length === 0 && <PriceChip symbol={symbol} price={item.price} />}
        </div>
        {item.variants.length > 0 && (
          <VariantPriceChips symbol={symbol} variants={item.variants} className="mt-1.5" />
        )}
        {item.description && (
          <p className="text-muted-foreground mt-1.5 text-[14px] leading-[1.55]">
            {item.description}
          </p>
        )}
        <DietaryTagPills tags={item.tags} className="mt-2" />
      </div>
    </li>
  )
})

export const DefaultTemplate: TemplateDef = {
  id: 'default',
  label: 'Editorial',
  description: 'Clean text-first layout with a small thumbnail next to each dish.',
  Body: DefaultBody,
}
