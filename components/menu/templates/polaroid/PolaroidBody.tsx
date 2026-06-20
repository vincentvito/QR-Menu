'use client'

import { memo, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Search, Sparkles, X } from 'lucide-react'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { DietaryTagPills } from '@/components/menu/DietaryTagPills'
import { PriceChip } from '@/components/menu/PriceChip'
import { VariantPriceChips } from '@/components/menu/VariantPriceChips'
import { categoryIcon } from '@/lib/menus/category-icon'
import { cn } from '@/lib/utils'
import type {
  TemplateBodyProps,
  TemplateCategoryGroup,
  TemplateItem,
} from '@/components/menu/templates/types'

const SPECIALS_KEY = '__specials__'

export function PolaroidBody({
  groups,
  specials,
  specialsAnchorId,
  symbol,
  onOpenImage,
  preview,
  query,
  onQueryChange,
  hasQuery,
}: TemplateBodyProps) {
  const t = useTranslations('MenuView')
  const [selectedRaw, setSelected] = useState<string | null>(null)

  const firstGroupId = groups[0]?.id ?? null
  const selected =
    selectedRaw === SPECIALS_KEY
      ? specials.length > 0
        ? SPECIALS_KEY
        : firstGroupId
      : selectedRaw && groups.some((g) => g.id === selectedRaw)
        ? selectedRaw
        : firstGroupId

  const activeGroup = groups.find((g) => g.id === selected) ?? groups[0] ?? null
  const deckTitle = selected === SPECIALS_KEY ? t('todaysSpecials') : activeGroup?.category
  const deckItems = selected === SPECIALS_KEY ? specials : (activeGroup?.items ?? [])
  const searchItems = useMemo(() => flattenItems(groups, specials), [groups, specials])
  const showSearch = Boolean(hasQuery) && !preview

  return (
    <>
      <div className={cn('relative pt-6', preview ? 'pb-20' : 'pb-36')}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-20px] top-0 h-56 opacity-80"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 0%, color-mix(in oklab, var(--accent) 30%, transparent) 0%, transparent 70%)',
          }}
        />

        <header className="relative pr-16">
          <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
            <Camera className="size-3.5" aria-hidden="true" />
            {showSearch ? t('results') : t('allCategory')}
          </p>
          <h2 className="mt-1 text-[30px] leading-[1.02] font-semibold tracking-[-0.03em]">
            {showSearch ? t('searchLabel') : deckTitle}
          </h2>
        </header>

        {showSearch ? (
          <ul className="mt-6 space-y-5">
            {searchItems.map((item) => (
              <SearchDishRow key={item.id} item={item} symbol={symbol} onOpenImage={onOpenImage} />
            ))}
          </ul>
        ) : (
          <Deck
            items={deckItems}
            symbol={symbol}
            onOpenImage={onOpenImage}
            preview={preview}
            anchorId={selected === SPECIALS_KEY ? specialsAnchorId : activeGroup?.id}
          />
        )}

        {/* The floating switcher belongs to the deck view. During an active
            search the deck is replaced by the results list, and clearing the
            query is owned by the bottom chrome — so hide it here to avoid a
            dead control that overlaps the results. */}
        {!showSearch && (
          <FloatingCategories
            groups={groups}
            specials={specials}
            selected={selected}
            onSelect={(key) => {
              if (preview) return
              setSelected(key)
            }}
            preview={preview}
          />
        )}
      </div>

      {!preview && (
        <PolaroidChrome
          groups={groups}
          specials={specials}
          selected={selected}
          onSelect={setSelected}
          query={query ?? ''}
          onQueryChange={onQueryChange ?? (() => {})}
          hasQuery={Boolean(hasQuery)}
        />
      )}
    </>
  )
}

function flattenItems(groups: TemplateCategoryGroup[], specials: TemplateItem[]) {
  const seen = new Set<string>()
  const out: TemplateItem[] = []
  for (const item of specials) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  for (const group of groups) {
    for (const item of group.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
  }
  return out
}

interface DeckProps {
  items: TemplateItem[]
  symbol: string
  onOpenImage: (src: string) => void
  preview?: boolean
  anchorId?: string
}

function Deck({ items, symbol, onOpenImage, preview, anchorId }: DeckProps) {
  return (
    <div id={anchorId} className="relative mt-7 scroll-mt-8">
      <div
        aria-hidden="true"
        className="border-cream-line bg-card absolute top-5 right-4 left-4 h-[380px] rotate-3 rounded-[8px] border shadow-[0_18px_45px_-34px_rgba(0,0,0,0.45)]"
      />
      <div
        aria-hidden="true"
        className="border-cream-line bg-card absolute top-3 right-5 left-5 h-[380px] -rotate-2 rounded-[8px] border shadow-[0_18px_45px_-34px_rgba(0,0,0,0.45)]"
      />
      <ul className="no-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 py-2 pr-12">
        {items.map((item, index) => (
          <PolaroidCard
            key={item.id}
            item={item}
            symbol={symbol}
            onOpenImage={onOpenImage}
            preview={preview}
            tilt={index % 3 === 0 ? '-rotate-2' : index % 3 === 1 ? 'rotate-1' : 'rotate-2'}
          />
        ))}
      </ul>
    </div>
  )
}

interface CardProps {
  item: TemplateItem
  symbol: string
  onOpenImage: (src: string) => void
  preview?: boolean
  tilt: string
}

const PolaroidCard = memo(function PolaroidCard({
  item,
  symbol,
  onOpenImage,
  preview,
  tilt,
}: CardProps) {
  const t = useTranslations('MenuView')
  const imageUrl = item.imageUrl
  const photoClass =
    'bg-muted relative aspect-[4/5] w-full overflow-hidden rounded-[4px] border border-black/5'

  return (
    <li
      className={cn(
        'bg-card text-card-foreground border-cream-line min-h-[430px] w-[82%] max-w-[360px] shrink-0 snap-center rounded-[8px] border p-3 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.5)] transition-transform duration-300 sm:w-[72%]',
        tilt,
      )}
    >
      {imageUrl ? (
        preview ? (
          <div className={photoClass}>
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
            className={`${photoClass} focus-visible:ring-foreground transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:outline-none`}
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
      ) : (
        <div className={`${photoClass} grid place-items-center`}>
          <span className="text-muted-foreground/70 text-[11px] font-semibold tracking-[0.18em] uppercase">
            {t('noPhoto')}
          </span>
        </div>
      )}

      <div className="px-1 pt-4 pb-2">
        <BadgeRow badges={item.badges} />
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h3 className="min-w-0 text-[21px] leading-[1.04] font-semibold tracking-[-0.02em]">
            {item.name}
          </h3>
          {item.variants.length === 0 && <PriceChip symbol={symbol} price={item.price} />}
        </div>
        {item.variants.length > 0 && (
          <VariantPriceChips symbol={symbol} variants={item.variants} className="mt-2" />
        )}
        {item.description && (
          <p className="text-muted-foreground mt-2 text-[14px] leading-[1.55]">
            {item.description}
          </p>
        )}
        <DietaryTagPills tags={item.tags} className="mt-3" pillClassName="text-[10px]" />
      </div>
    </li>
  )
})

interface FloatingCategoriesProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  selected: string | null
  onSelect: (key: string) => void
  preview?: boolean
}

function FloatingCategories({
  groups,
  specials,
  selected,
  onSelect,
  preview,
}: FloatingCategoriesProps) {
  const t = useTranslations('MenuView')
  return (
    <nav
      aria-label={t('quickCategoryNav')}
      className={cn(
        'absolute top-6 right-0 z-10 flex w-12 flex-col items-center gap-2',
        preview && 'pointer-events-none',
      )}
    >
      {specials.length > 0 && (
        <CategoryDot
          label={t('specialsShort')}
          active={selected === SPECIALS_KEY}
          tone="pop"
          onClick={() => onSelect(SPECIALS_KEY)}
        >
          <Sparkles className="size-4" aria-hidden="true" />
        </CategoryDot>
      )}
      {groups.map((group) => {
        const Icon = categoryIcon(group.category, group.iconId)
        return (
          <CategoryDot
            key={group.id}
            label={group.category}
            active={selected === group.id}
            onClick={() => onSelect(group.id)}
          >
            <Icon className="size-4" aria-hidden="true" />
          </CategoryDot>
        )
      })}
    </nav>
  )
}

function CategoryDot({
  label,
  active,
  tone = 'default',
  onClick,
  children,
}: {
  label: string
  active: boolean
  tone?: 'default' | 'pop'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      title={label}
      className={cn(
        'border-cream-line focus-visible:ring-foreground grid size-10 place-items-center rounded-full border shadow-[0_8px_20px_-12px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none',
        active
          ? tone === 'pop'
            ? 'bg-pop text-pop-foreground'
            : 'bg-foreground text-background'
          : 'bg-card/92 text-foreground backdrop-blur-md',
      )}
    >
      {children}
    </button>
  )
}

interface SearchDishRowProps {
  item: TemplateItem
  symbol: string
  onOpenImage: (src: string) => void
}

const SearchDishRow = memo(function SearchDishRow({
  item,
  symbol,
  onOpenImage,
}: SearchDishRowProps) {
  const t = useTranslations('MenuView')
  const imageUrl = item.imageUrl
  return (
    <li className="border-cream-line bg-card flex gap-4 rounded-[8px] border p-3">
      {imageUrl ? (
        <button
          type="button"
          aria-label={t('openPhotoAria', { item: item.name })}
          onClick={() => onOpenImage(imageUrl)}
          className="border-cream-line bg-background focus-visible:ring-foreground size-[92px] shrink-0 overflow-hidden rounded-[6px] border focus-visible:ring-2 focus-visible:outline-none"
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
      ) : null}
      <div className="min-w-0 flex-1">
        <BadgeRow badges={item.badges} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h3 className="text-[17px] leading-tight font-semibold tracking-[-0.01em]">
            {item.name}
          </h3>
          {item.variants.length === 0 && <PriceChip symbol={symbol} price={item.price} />}
        </div>
        {item.variants.length > 0 && (
          <VariantPriceChips
            symbol={symbol}
            variants={item.variants}
            size="sm"
            className="mt-1.5"
          />
        )}
        {item.description && (
          <p className="text-muted-foreground mt-1.5 text-[13px] leading-[1.5]">
            {item.description}
          </p>
        )}
      </div>
    </li>
  )
})

interface PolaroidChromeProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  selected: string | null
  onSelect: (key: string | null) => void
  query: string
  onQueryChange: (next: string) => void
  hasQuery: boolean
}

function PolaroidChrome({
  groups,
  specials,
  selected,
  onSelect,
  query,
  onQueryChange,
  hasQuery,
}: PolaroidChromeProps) {
  const t = useTranslations('MenuView')
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/90 border-cream-line border-t backdrop-blur-md">
        <div className="mx-auto max-w-[720px] px-5 pt-3 pb-3 sm:px-8">
          <label htmlFor="polaroid-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="polaroid-search"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="border-cream-line bg-card focus:border-foreground/40 focus:bg-background h-11 w-full rounded-full border pr-10 pl-10 text-[14px] transition-colors outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {hasQuery && (
              <button
                type="button"
                aria-label={t('searchClear')}
                onClick={() => onQueryChange('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <nav
            aria-label={t('quickCategoryNav')}
            className="no-scrollbar scroll-fade-x mt-3 flex gap-2 overflow-x-auto"
          >
            {specials.length > 0 && (
              <QuickButton
                label={t('specialsShort')}
                active={!hasQuery && selected === SPECIALS_KEY}
                tone="pop"
                onClick={() => {
                  onQueryChange('')
                  onSelect(SPECIALS_KEY)
                }}
              />
            )}
            {groups.map((group) => (
              <QuickButton
                key={group.id}
                label={group.category}
                active={!hasQuery && selected === group.id}
                onClick={() => {
                  onQueryChange('')
                  onSelect(group.id)
                }}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

function QuickButton({
  label,
  active,
  tone = 'default',
  onClick,
}: {
  label: string
  active: boolean
  tone?: 'default' | 'pop'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-[12px] px-4 py-2 text-[12px] font-semibold whitespace-nowrap transition-colors',
        active
          ? tone === 'pop'
            ? 'bg-pop text-pop-foreground'
            : 'bg-foreground text-background'
          : tone === 'pop'
            ? 'bg-pop/15 text-pop hover:bg-pop/25'
            : 'bg-card text-foreground hover:bg-foreground/10',
      )}
    >
      {label}
    </button>
  )
}
