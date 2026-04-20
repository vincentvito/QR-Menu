'use client'

import { memo, useMemo, useState } from 'react'
import { ArrowLeft, Search, Sparkles, X } from 'lucide-react'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { PriceChip } from '@/components/menu/PriceChip'
import { categoryIcon } from '@/lib/menus/category-icon'
import { cn } from '@/lib/utils'
import type {
  TemplateBodyProps,
  TemplateCategoryGroup,
  TemplateItem,
} from '@/components/menu/templates/types'

// Category Tiles template — client-only Body. The TemplateDef metadata
// (id, label, chrome flag) lives in CategoryTilesTemplate.tsx so the
// API route can import it server-side without crossing a 'use client'
// boundary (which would otherwise make TEMPLATES.some(t => t.id ===...)
// fail because React turns the whole module into an opaque proxy).

const SPECIALS_KEY = '__specials__'

export function CategoryTilesBody({
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
  // null = grid view. SPECIALS_KEY = specials list. Otherwise matches a
  // group id. Preview stays on the grid so the picker shows the tiles.
  const [selectedRaw, setSelected] = useState<string | null>(null)

  // Derive the effective selection during render so filter changes can
  // gracefully fall back to the grid without an extra effect round-trip.
  // If the stored selection points at a group that's been filtered out
  // (or at specials when there are none), we treat it as null.
  const selected = !selectedRaw
    ? null
    : selectedRaw === SPECIALS_KEY
      ? specials.length > 0
        ? SPECIALS_KEY
        : null
      : groups.some((g) => g.id === selectedRaw)
        ? selectedRaw
        : null

  const activeGroup =
    selected && selected !== SPECIALS_KEY ? (groups.find((g) => g.id === selected) ?? null) : null
  const showGrid = preview ? true : !hasQuery && !selected
  const bodyPaddingClass = preview ? 'pb-[104px]' : 'pb-[112px]'

  return (
    <>
      <div className={bodyPaddingClass}>
        {hasQuery && !preview ? (
          <SearchResults
            groups={groups}
            specials={specials}
            symbol={symbol}
            onOpenImage={onOpenImage}
          />
        ) : showGrid ? (
          <Grid
            groups={groups}
            specials={specials}
            onSelect={(key) => {
              if (preview) return
              setSelected(key)
            }}
            preview={preview}
            specialsAnchorId={specialsAnchorId}
          />
        ) : selected === SPECIALS_KEY ? (
          <CategoryView
            title="Today's Specials"
            accent="pop"
            items={specials}
            symbol={symbol}
            onBack={() => setSelected(null)}
            onOpenImage={onOpenImage}
          />
        ) : activeGroup ? (
          <CategoryView
            title={activeGroup.category}
            items={activeGroup.items}
            symbol={symbol}
            onBack={() => setSelected(null)}
            onOpenImage={onOpenImage}
          />
        ) : null}
      </div>

      {!preview && (
        <BottomChrome
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

// --- Grid (landing view) -------------------------------------------------

interface GridProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  onSelect: (key: string) => void
  preview?: boolean
  specialsAnchorId: string
}

function Grid({ groups, specials, onSelect, preview, specialsAnchorId }: GridProps) {
  return (
    <div className="mt-6 space-y-4">
      {specials.length > 0 && (
        <SpecialsTile
          count={specials.length}
          anchorId={specialsAnchorId}
          onClick={() => onSelect(SPECIALS_KEY)}
          preview={preview}
        />
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {groups.map((g) => (
          <CategoryTile key={g.id} group={g} onClick={() => onSelect(g.id)} preview={preview} />
        ))}
      </div>
    </div>
  )
}

interface SpecialsTileProps {
  count: number
  anchorId: string
  onClick: () => void
  preview?: boolean
}

function SpecialsTile({ count, anchorId, onClick, preview }: SpecialsTileProps) {
  const className =
    'group bg-pop text-pop-foreground relative block w-full overflow-hidden rounded-[20px] px-5 py-5 text-left transition-transform hover:scale-[1.01] disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground'
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className="bg-pop-foreground/15 flex size-12 shrink-0 items-center justify-center rounded-[14px]">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase opacity-80">
            Don&apos;t miss
          </p>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Today&apos;s Specials</h2>
        </div>
        <span className="bg-pop-foreground/15 rounded-full px-3 py-1 text-[11px] font-semibold">
          {count} {count === 1 ? 'dish' : 'dishes'}
        </span>
      </div>
    </>
  )

  if (preview) {
    return (
      <div
        id={anchorId}
        className={className}
        style={{
          boxShadow:
            '0 0 36px -4px color-mix(in oklab, var(--pop) 45%, transparent), 0 6px 18px -10px rgba(0,0,0,0.2)',
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      id={anchorId}
      onClick={onClick}
      className={className}
      style={{
        boxShadow:
          '0 0 36px -4px color-mix(in oklab, var(--pop) 45%, transparent), 0 6px 18px -10px rgba(0,0,0,0.2)',
      }}
    >
      {content}
    </button>
  )
}

interface CategoryTileProps {
  group: TemplateCategoryGroup
  onClick: () => void
  preview?: boolean
}

const CategoryTile = memo(function CategoryTile({ group, onClick, preview }: CategoryTileProps) {
  const Icon = categoryIcon(group.category)
  const bgImage = group.items.find((i) => i.imageUrl)?.imageUrl ?? null
  const className =
    'group border-cream-line bg-card relative aspect-square w-full overflow-hidden rounded-[20px] border text-left transition-transform hover:scale-[1.02] disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground'
  const content = (
    <>
      {bgImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.18) 100%)',
            }}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="bg-accent/20 absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--accent) 45%, transparent) 0%, transparent 60%), radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--pop) 40%, transparent) 0%, transparent 55%)',
          }}
        />
      )}

      <div
        className={cn(
          'relative flex h-full flex-col justify-between p-4',
          bgImage ? 'text-white' : 'text-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-[14px]',
            bgImage ? 'bg-white/15 backdrop-blur-sm' : 'bg-background/60 backdrop-blur-sm',
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-[17px] leading-tight font-semibold tracking-[-0.01em]">
            {group.category}
          </h3>
          <p
            className={cn(
              'mt-0.5 text-[11px] font-medium',
              bgImage ? 'opacity-85' : 'text-muted-foreground',
            )}
          >
            {group.items.length} {group.items.length === 1 ? 'dish' : 'dishes'}
          </p>
        </div>
      </div>
    </>
  )

  if (preview) {
    return (
      <div aria-label={`${group.category} preview`} className={className}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${group.category}`}
      className={className}
    >
      {content}
    </button>
  )
})

// --- Category detail view ------------------------------------------------

interface CategoryViewProps {
  title: string
  accent?: 'default' | 'pop'
  items: TemplateItem[]
  symbol: string
  onBack: () => void
  onOpenImage: (src: string) => void
}

function CategoryView({
  title,
  accent = 'default',
  items,
  symbol,
  onBack,
  onOpenImage,
}: CategoryViewProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to all categories"
          className="border-cream-line bg-card hover:bg-foreground hover:text-background inline-flex size-9 items-center justify-center rounded-full border transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <h2
          className={cn(
            'text-[22px] font-semibold tracking-[-0.01em]',
            accent === 'pop' && 'text-pop',
          )}
        >
          {title}
        </h2>
      </div>
      <ul className="mt-6 space-y-6">
        {items.map((item) => (
          <DishRow key={item.id} item={item} symbol={symbol} onOpenImage={onOpenImage} />
        ))}
      </ul>
    </div>
  )
}

// --- Search results (flat list) -----------------------------------------

interface SearchResultsProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  symbol: string
  onOpenImage: (src: string) => void
}

function SearchResults({ groups, specials, symbol, onOpenImage }: SearchResultsProps) {
  // Flatten all visible items while deduping (a dish can appear in both
  // specials and its category — we only want it once in the search list).
  // Memoized so keystroke-driven re-renders don't redo the O(n) walk
  // unless the filtered groups/specials actually change.
  const items = useMemo(() => {
    const seen = new Set<string>()
    const out: TemplateItem[] = []
    for (const it of specials) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      out.push(it)
    }
    for (const g of groups) {
      for (const it of g.items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        out.push(it)
      }
    }
    return out
  }, [groups, specials])
  return (
    <div className="mt-6">
      <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
        Results
      </h2>
      <ul className="mt-5 space-y-6">
        {items.map((item) => (
          <DishRow key={item.id} item={item} symbol={symbol} onOpenImage={onOpenImage} />
        ))}
      </ul>
    </div>
  )
}

// --- Dish row (shared by detail + search views) --------------------------

interface DishRowProps {
  item: TemplateItem
  symbol: string
  onOpenImage: (src: string) => void
}

const DishRow = memo(function DishRow({ item, symbol, onOpenImage }: DishRowProps) {
  const imageUrl = item.imageUrl
  return (
    <li className="flex gap-4">
      {imageUrl ? (
        <button
          type="button"
          aria-label={`Open photo of ${item.name}`}
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
      ) : null}
      <div className="min-w-0 flex-1">
        <BadgeRow badges={item.badges} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h3 className="min-w-0 text-[17px] leading-tight font-semibold tracking-[-0.01em]">
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

// --- Bottom chrome (sticky) ---------------------------------------------

interface BottomChromeProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  selected: string | null
  onSelect: (key: string | null) => void
  query: string
  onQueryChange: (next: string) => void
  hasQuery: boolean
}

function BottomChrome({
  groups,
  specials,
  selected,
  onSelect,
  query,
  onQueryChange,
  hasQuery,
}: BottomChromeProps) {
  // Pills hide on the grid landing so the tiles are the undisputed
  // primary wayfinding. They slide up + fade in once the guest opens a
  // category or starts a search — chrome height grows smoothly thanks
  // to the animated max-height + margin collapse. Search stays
  // available in every state so guests can filter from the grid too.
  const pillsVisible = selected !== null || hasQuery
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/90 border-cream-line border-t backdrop-blur-md">
        <div className="mx-auto max-w-[720px] px-5 pt-3 pb-3 sm:px-8">
          <label htmlFor="category-tiles-search" className="sr-only">
            Search dishes
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="category-tiles-search"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search dishes, ingredients, tags..."
              className="border-cream-line bg-card focus:border-foreground/40 focus:bg-background h-11 w-full rounded-full border pr-10 pl-10 text-[14px] transition-colors outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {hasQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <nav
            aria-label="Quick category nav"
            aria-hidden={!pillsVisible}
            className={cn(
              'no-scrollbar scroll-fade-x flex gap-2 overflow-x-auto',
              'origin-bottom overflow-y-hidden transition-all duration-300 ease-out',
              pillsVisible
                ? 'mt-3 max-h-14 translate-y-0 opacity-100'
                : 'pointer-events-none mt-0 max-h-0 translate-y-2 opacity-0',
            )}
          >
            <QuickButton
              label="All"
              active={!selected && !hasQuery}
              onClick={() => onSelect(null)}
            />
            {specials.length > 0 && (
              <QuickButton
                label="Specials"
                tone="pop"
                active={selected === SPECIALS_KEY}
                onClick={() => onSelect(SPECIALS_KEY)}
              />
            )}
            {groups.map((g) => (
              <QuickButton
                key={g.id}
                label={g.category}
                active={selected === g.id}
                onClick={() => onSelect(g.id)}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

interface QuickButtonProps {
  label: string
  active: boolean
  tone?: 'default' | 'pop'
  onClick: () => void
}

function QuickButton({ label, active, tone = 'default', onClick }: QuickButtonProps) {
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

// --- Bottom chrome mock for the Settings preview ------------------------

export function CategoryTilesPreviewChrome({
  groups,
  specials,
  selected,
}: {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  selected: string | null
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40">
      <div className="bg-background/90 border-cream-line border-t backdrop-blur-md">
        <div className="px-5 pt-3 pb-3">
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <div className="border-cream-line bg-card text-muted-foreground flex h-11 items-center rounded-full border pr-4 pl-10 text-[13px]">
              Search dishes, ingredients, tags...
            </div>
          </div>
          <div className="no-scrollbar scroll-fade-x mt-3 flex gap-2 overflow-x-auto">
            <span
              className={cn(
                'shrink-0 rounded-[12px] px-4 py-2 text-[12px] font-semibold whitespace-nowrap',
                !selected ? 'bg-foreground text-background' : 'bg-card text-foreground',
              )}
            >
              All
            </span>
            {specials.length > 0 && (
              <span className="bg-pop/15 text-pop shrink-0 rounded-[12px] px-4 py-2 text-[12px] font-semibold whitespace-nowrap">
                Specials
              </span>
            )}
            {groups.map((g) => (
              <span
                key={g.id}
                className="bg-card text-foreground shrink-0 rounded-[12px] px-4 py-2 text-[12px] font-semibold whitespace-nowrap"
              >
                {g.category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
