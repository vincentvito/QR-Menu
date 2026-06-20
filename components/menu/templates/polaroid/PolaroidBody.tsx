'use client'

import {
  memo,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import { Camera, ChevronLeft, ChevronRight, Search, Sparkles, X } from 'lucide-react'
import { BadgeRow } from '@/components/menu/BadgeRow'
import { DietaryTagPills } from '@/components/menu/DietaryTagPills'
import { PriceChip } from '@/components/menu/PriceChip'
import { VariantPriceChips } from '@/components/menu/VariantPriceChips'
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

  // The deck position lives here (not inside Deck) so the bottom-bar arrows
  // and the draggable card share one source of truth. Reset to the first
  // card when the category changes — adjusting state during render avoids an
  // effect (see notes/you-might-not-need-effect).
  const deckKey = selected ?? 'all'
  const total = deckItems.length
  const [deckState, setDeckState] = useState({ key: deckKey, index: 0 })
  let rawIndex = deckState.index
  if (deckState.key !== deckKey) {
    setDeckState({ key: deckKey, index: 0 })
    rawIndex = 0
  }
  const activeIndex = total > 0 ? ((rawIndex % total) + total) % total : 0
  const goTo = (next: number) =>
    setDeckState({ key: deckKey, index: total > 0 ? ((next % total) + total) % total : 0 })

  return (
    <>
      <div className={cn('relative overflow-x-clip pt-3', preview ? 'pb-20' : 'pb-36')}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-20px] top-0 h-32 opacity-80"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 0%, color-mix(in oklab, var(--accent) 30%, transparent) 0%, transparent 70%)',
          }}
        />

        <header className="relative pr-12">
          <h2 className="text-foreground flex items-center gap-1.5 text-[14px] font-semibold tracking-tight">
            <Camera className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{showSearch ? t('searchLabel') : deckTitle}</span>
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
            preview={preview}
            anchorId={selected === SPECIALS_KEY ? specialsAnchorId : activeGroup?.id}
            index={activeIndex}
            onNext={() => goTo(activeIndex + 1)}
            onPrev={() => goTo(activeIndex - 1)}
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
          query={query ?? ''}
          onQueryChange={onQueryChange ?? (() => {})}
          hasQuery={Boolean(hasQuery)}
          showNav={!showSearch && total > 1}
          navIndex={activeIndex}
          navTotal={total}
          onPrev={() => goTo(activeIndex - 1)}
          onNext={() => goTo(activeIndex + 1)}
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
  preview?: boolean
  anchorId?: string
  index: number
  onNext: () => void
  onPrev: () => void
}

type DragHandlers = {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void
}

const DRAG_THRESHOLD = 56

// A stacked pile of polaroids instead of a sideways scroll: the active dish
// sits on top with the rest fanned behind it. Drag the top card sideways
// (or use the arrows in the bottom bar) to move through the pile, which
// cycles so it never runs out. The active index is owned by the parent.
function Deck({ items, symbol, preview, anchorId, index, onNext, onPrev }: DeckProps) {
  const total = items.length
  const activeIndex = total > 0 ? ((index % total) + total) % total : 0
  const draggable = !preview && total > 1

  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const [drag, setDrag] = useState({ active: false, x: 0 })

  const pointerHandlers: DragHandlers | undefined = draggable
    ? {
        onPointerDown: (e) => {
          draggingRef.current = true
          startXRef.current = e.clientX
          setDrag({ active: true, x: 0 })
          e.currentTarget.setPointerCapture?.(e.pointerId)
        },
        onPointerMove: (e) => {
          if (!draggingRef.current) return
          setDrag({ active: true, x: e.clientX - startXRef.current })
        },
        onPointerUp: (e) => {
          if (!draggingRef.current) return
          draggingRef.current = false
          const dx = e.clientX - startXRef.current
          setDrag({ active: false, x: 0 })
          if (dx <= -DRAG_THRESHOLD) onNext()
          else if (dx >= DRAG_THRESHOLD) onPrev()
        },
        onPointerCancel: () => {
          draggingRef.current = false
          setDrag({ active: false, x: 0 })
        },
      }
    : undefined

  return (
    <div id={anchorId} className="scroll-mt-8">
      {/* `isolate` traps the cards' z-indexes (up to 60 while dragging) in
          their own stacking context so a dragged card can't paint over the
          floating category rail or bottom bar. */}
      <div className="relative isolate mx-auto mt-3 min-h-[400px] w-full max-w-[260px] select-none">
        {items.map((item, i) => {
          const pos = (((i - activeIndex) % total) + total) % total
          const isTop = pos === 0
          return (
            <StackCard
              key={item.id}
              pos={pos}
              total={total}
              isTop={isTop}
              draggable={isTop && draggable}
              drag={isTop ? drag : null}
              pointerHandlers={isTop ? pointerHandlers : undefined}
            >
              <PolaroidCardContent item={item} symbol={symbol} />
            </StackCard>
          )
        })}
      </div>
    </div>
  )
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-cream-line bg-card text-foreground hover:bg-foreground hover:text-background focus-visible:ring-foreground grid size-9 place-items-center rounded-full border transition-colors hover:scale-105 focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  )
}

// Position of a card within the pile, by distance from the top (pos 0).
// The single "edge" slot sits off-screen to the LEFT: on next, the top card
// slides out to it (matching a left drag); on previous, the incoming card
// slides in from it (so a right drag reads as the strip moving right). This
// keeps the motion horizontal and aligned with the drag. Shallow piles (<=4)
// just cycle a card to the back.
function stackStyle(pos: number, total: number): CSSProperties {
  const transition = 'transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease'
  if (total > 4 && pos === total - 1) {
    return {
      left: '50%',
      transform: 'translate(-180%, 6px) rotate(-12deg) scale(0.94)',
      opacity: 0,
      zIndex: 50,
      transition,
    }
  }
  const byPos: Record<number, CSSProperties> = {
    0: { transform: 'translate(-50%, 0) rotate(-1.5deg)', opacity: 1, zIndex: 40 },
    1: { transform: 'translate(-46%, 14px) rotate(2.5deg) scale(0.965)', opacity: 1, zIndex: 30 },
    2: { transform: 'translate(-54%, 24px) rotate(-3.5deg) scale(0.93)', opacity: 0.92, zIndex: 20 },
    3: { transform: 'translate(-49%, 32px) rotate(4.5deg) scale(0.9)', opacity: 0.6, zIndex: 10 },
  }
  const fallback: CSSProperties = {
    transform: 'translate(-50%, 36px) scale(0.88)',
    opacity: 0,
    zIndex: 0,
  }
  return { left: '50%', transition, ...(byPos[pos] ?? fallback) }
}

interface StackCardProps {
  pos: number
  total: number
  isTop: boolean
  draggable: boolean
  drag: { active: boolean; x: number } | null
  pointerHandlers?: DragHandlers
  children: ReactNode
}

function StackCard({ pos, total, isTop, draggable, drag, pointerHandlers, children }: StackCardProps) {
  let style = stackStyle(pos, total)
  if (isTop && drag?.active) {
    // Follow the pointer 1:1 while dragging (no transition), with a slight
    // tilt for feel. On release the parent advances and the stack settles.
    style = {
      ...style,
      transform: `translate(calc(-50% + ${drag.x}px), 0) rotate(${(drag.x * 0.05).toFixed(2)}deg)`,
      transition: 'none',
      zIndex: 60,
      touchAction: 'pan-y',
    }
  } else if (draggable) {
    // pan-y keeps vertical page scroll working while we own horizontal drags.
    style = { ...style, touchAction: 'pan-y' }
  }
  return (
    <div
      aria-hidden={!isTop}
      className={cn(
        'bg-card text-card-foreground border-cream-line absolute top-0 w-full rounded-[8px] border p-3 text-left shadow-[0_18px_50px_-30px_rgba(0,0,0,0.5)]',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      style={style}
      {...(pointerHandlers ?? {})}
    >
      {children}
    </div>
  )
}

const PolaroidCardContent = memo(function PolaroidCardContent({
  item,
  symbol,
}: {
  item: TemplateItem
  symbol: string
}) {
  const t = useTranslations('MenuView')
  const imageUrl = item.imageUrl
  const photoClass =
    'bg-muted relative aspect-square w-full overflow-hidden rounded-[4px] border border-black/5'

  return (
    <>
      {imageUrl ? (
        <div className={photoClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none h-full w-full object-cover select-none"
          />
        </div>
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
          <p className="text-muted-foreground mt-2 line-clamp-3 text-[14px] leading-[1.55]">
            {item.description}
          </p>
        )}
        <DietaryTagPills tags={item.tags} className="mt-3" pillClassName="text-[10px]" />
      </div>
    </>
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
        'no-scrollbar z-40 flex max-h-[70vh] flex-col items-end gap-1.5 overflow-y-auto py-1',
        preview
          ? 'pointer-events-none absolute top-1/2 right-0 -translate-y-1/2'
          : 'fixed top-1/2 right-2 -translate-y-1/2',
      )}
    >
      {specials.length > 0 && (
        <CategoryPill
          label={t('specialsShort')}
          active={selected === SPECIALS_KEY}
          tone="pop"
          icon
          onClick={() => onSelect(SPECIALS_KEY)}
        />
      )}
      {groups.map((group) => (
        <CategoryPill
          key={group.id}
          label={group.category}
          active={selected === group.id}
          onClick={() => onSelect(group.id)}
        />
      ))}
    </nav>
  )
}

// Small label pills (not icons) — not every category has a recognizable icon,
// so text reads clearer. They float over the right gutter with a backdrop
// blur and truncate long names.
function CategoryPill({
  label,
  active,
  tone = 'default',
  icon,
  onClick,
}: {
  label: string
  active: boolean
  tone?: 'default' | 'pop'
  icon?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={label}
      className={cn(
        'focus-visible:ring-foreground inline-flex max-w-[120px] items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-[0_8px_20px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors focus-visible:ring-2 focus-visible:outline-none',
        active
          ? tone === 'pop'
            ? 'border-transparent bg-pop text-pop-foreground'
            : 'border-transparent bg-foreground text-background'
          : 'border-cream-line bg-card/92 text-foreground',
      )}
    >
      {icon && <Sparkles className="size-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{label}</span>
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
  query: string
  onQueryChange: (next: string) => void
  hasQuery: boolean
  showNav: boolean
  navIndex: number
  navTotal: number
  onPrev: () => void
  onNext: () => void
}

function PolaroidChrome({
  query,
  onQueryChange,
  hasQuery,
  showNav,
  navIndex,
  navTotal,
  onPrev,
  onNext,
}: PolaroidChromeProps) {
  const t = useTranslations('MenuView')
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/90 border-cream-line border-t backdrop-blur-md">
        <div className="mx-auto max-w-[720px] px-5 pt-3 pb-3 sm:px-8">
          {/* Dish navigation. Arrows are desktop-only (sm+) where the drag
              gesture isn't obvious; on mobile the card is dragged directly,
              so only the position counter shows. */}
          {showNav && (
            <div className="mb-3 flex items-center justify-center gap-4">
              <span className="hidden sm:inline-flex">
                <NavButton label={t('polaroidPrevAria')} onClick={onPrev}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </NavButton>
              </span>
              <span className="text-muted-foreground min-w-[44px] text-center text-[12px] font-semibold tabular-nums">
                {navIndex + 1} / {navTotal}
              </span>
              <span className="hidden sm:inline-flex">
                <NavButton label={t('polaroidNextAria')} onClick={onNext}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </NavButton>
              </span>
            </div>
          )}
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
        </div>
      </div>
    </div>
  )
}
