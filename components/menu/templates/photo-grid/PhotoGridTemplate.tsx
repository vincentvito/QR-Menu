import { memo } from 'react'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { PriceChip } from '@/components/menu/PriceChip'
import { cn } from '@/lib/utils'
import type {
  TemplateBodyProps,
  TemplateDef,
  TemplateItem,
} from '@/components/menu/templates/types'

// Photo Grid template: photo-forward 2-column grid. Dishes render as tall
// cards with a square photo on top and text below. Dishes without photos
// still work — the photo slot collapses to a tinted placeholder so the
// grid stays even.

function PhotoGridBody({
  groups,
  specials,
  specialsAnchorId,
  symbol,
  onOpenImage,
  preview,
}: TemplateBodyProps) {
  return (
    <>
      {specials.length > 0 && (
        <section
          id={specialsAnchorId}
          className={cn(
            'border-pop/50 bg-pop/10 scroll-mt-40 mt-6 rounded-[20px] border p-5 sm:p-7',
            preview && 'mt-0',
          )}
          style={{
            boxShadow:
              '0 0 36px -4px color-mix(in oklab, var(--pop) 35%, transparent), 0 6px 18px -10px rgba(0,0,0,0.15)',
          }}
        >
          <h2 className="bg-pop text-pop-foreground mb-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
            Today&apos;s Specials
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {specials.map((item) => (
              <PhotoGridTile
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
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5">
            {g.items.map((item) => (
              <PhotoGridTile
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

interface TileProps {
  item: TemplateItem
  symbol: string
  onOpenImage: (src: string) => void
  preview?: boolean
}

const PhotoGridTile = memo(function PhotoGridTile({
  item,
  symbol,
  onOpenImage,
  preview,
}: TileProps) {
  const imageUrl = item.imageUrl
  const photoTileClass =
    'border-cream-line bg-card relative aspect-square w-full overflow-hidden rounded-[16px] border'
  return (
    <li className="flex flex-col">
      {imageUrl ? (
        preview ? (
          <div className={photoTileClass}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {item.price > 0 && (
              <span className="absolute right-2 bottom-2">
                <PriceChip symbol={symbol} price={item.price} size="sm" />
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Open photo of ${item.name}`}
            onClick={() => onOpenImage(imageUrl)}
            className={`${photoTileClass} transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {item.price > 0 && (
              <span className="absolute right-2 bottom-2">
                <PriceChip symbol={symbol} price={item.price} size="sm" />
              </span>
            )}
          </button>
        )
      ) : (
        <div className="border-cream-line bg-card/60 relative flex aspect-square w-full items-center justify-center rounded-[16px] border">
          <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-[0.18em] uppercase">
            No photo
          </span>
          {item.price > 0 && (
            <span className="absolute right-2 bottom-2">
              <PriceChip symbol={symbol} price={item.price} size="sm" />
            </span>
          )}
        </div>
      )}
      <div className="mt-2.5 space-y-1">
        <BadgeRow badges={item.badges} />
        <h3 className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-muted-foreground line-clamp-2 text-[12.5px] leading-[1.5]">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="bg-accent/30 text-foreground rounded-[6px] px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.1em] uppercase"
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

export const PhotoGridTemplate: TemplateDef = {
  id: 'photo-grid',
  label: 'Photo grid',
  description:
    'Photo-forward 2-column grid. Best when most dishes have photos uploaded.',
  Body: PhotoGridBody,
}
