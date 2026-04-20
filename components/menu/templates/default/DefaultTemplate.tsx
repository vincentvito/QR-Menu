import { memo } from 'react'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { PriceChip } from '@/components/menu/PriceChip'
import { cn } from '@/lib/utils'
import type {
  TemplateBodyProps,
  TemplateDef,
  TemplateItem,
} from '@/components/menu/templates/types'

// Default template: text-first list with a small square photo thumbnail on
// the left when the dish has one. The original QRmenucrafter look.

function DefaultBody({
  groups,
  specials,
  specialsAnchorId,
  symbol,
  disabledBadges,
  onOpenImage,
  preview,
}: TemplateBodyProps) {
  return (
    <>
      {specials.length > 0 && (
        <section
          id={specialsAnchorId}
          className={cn(
            'border-pop/30 bg-pop/5 scroll-mt-40 mt-6 rounded-[20px] border p-6 sm:p-8',
            preview && 'mt-0',
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-pop text-[11px] font-semibold tracking-[0.18em] uppercase">
              Today&apos;s Specials
            </h2>
            <span className="text-muted-foreground text-xs">{specials.length}</span>
          </div>
          <ul className="mt-5 space-y-6">
            {specials.map((item) => (
              <DefaultDishCard
                key={item.id}
                item={item}
                symbol={symbol}
                disabledBadges={disabledBadges}
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
                disabledBadges={disabledBadges}
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
  disabledBadges: string[]
  onOpenImage: (src: string) => void
  preview?: boolean
}

const DefaultDishCard = memo(function DefaultDishCard({
  item,
  symbol,
  disabledBadges,
  onOpenImage,
  preview,
}: DishCardProps) {
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
            aria-label={`Open photo of ${item.name}`}
            onClick={() => onOpenImage(imageUrl)}
            className="border-cream-line bg-card size-[84px] shrink-0 overflow-hidden rounded-[14px] border transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
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
        <BadgeRow badges={item.badges} disabled={disabledBadges} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h3 className="min-w-0 text-[17px] font-semibold leading-tight tracking-[-0.01em]">
            {item.name}
          </h3>
          <PriceChip symbol={symbol} price={item.price} />
        </div>
        {item.description && (
          <p className="text-muted-foreground mt-1.5 text-[14px] leading-[1.55]">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="bg-accent/30 text-foreground rounded-[6px] px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
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
