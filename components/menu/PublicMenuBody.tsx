'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { BadgeRow } from '@/components/menu/BadgeRow'

interface PublicItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  tags: string[]
  badges: string[]
}

interface PublicMenuBodyProps {
  items: PublicItem[]
  // IDs of items that are currently on special. Resolved against `items`
  // client-side so we don't serialize the same dish twice.
  specialIds: string[]
  symbol: string
  disabledBadges: string[]
}

const SPECIALS_ANCHOR_ID = 'todays-specials'

export function PublicMenuBody({
  items,
  specialIds,
  symbol,
  disabledBadges,
}: PublicMenuBodyProps) {
  const t = useTranslations('MenuView')
  const [query, setQuery] = useState('')

  const { visibleGroups, visibleSpecials, totalMatches, hasQuery } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (it: PublicItem) => {
      if (!q) return true
      const hay =
        it.name.toLowerCase() +
        ' ' +
        it.description.toLowerCase() +
        ' ' +
        it.tags.join(' ').toLowerCase()
      return hay.includes(q)
    }
    const filtered = q ? items.filter(matches) : items
    const specialsSet = new Set(specialIds)
    const filteredSpecials = filtered.filter((it) => specialsSet.has(it.id))

    // Group filtered items by category, preserving first-seen order.
    const order: string[] = []
    const groups = new Map<string, PublicItem[]>()
    for (const item of filtered) {
      const key = item.category || 'Other'
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      groups.get(key)!.push(item)
    }

    return {
      visibleGroups: order.map((category) => ({ category, items: groups.get(category)! })),
      visibleSpecials: filteredSpecials,
      totalMatches: filtered.length,
      hasQuery: q.length > 0,
    }
  }, [items, specialIds, query])

  const categoryIds = visibleGroups.map((g, i) => `cat-${i}-${slugId(g.category)}`)
  // Show the nav any time there's something worth jumping to — specials OR
  // more than one category. During search we hide it because section
  // composition has become ad-hoc.
  const showCategoryNav =
    !hasQuery && (visibleSpecials.length > 0 || visibleGroups.length > 1)

  function renderItem(item: PublicItem) {
    return (
      <li key={item.id}>
        <BadgeRow badges={item.badges} disabled={disabledBadges} />
        <div className="flex items-baseline gap-3">
          <h3 className="flex-1 text-[17px] font-semibold leading-tight tracking-[-0.01em]">
            {item.name}
          </h3>
          {item.price > 0 && (
            <span className="bg-foreground text-accent shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums">
              {symbol}
              {formatPrice(item.price)}
            </span>
          )}
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
      </li>
    )
  }

  return (
    <>
      {/* Search + optional category nav, both sticky under the cover */}
      <div className="bg-background/80 border-cream-line sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto max-w-[720px] px-5 pt-3 sm:px-8">
          <label htmlFor="menu-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="border-cream-line bg-card focus:border-foreground/40 focus:bg-background h-11 w-full rounded-full border pl-10 pr-10 text-[14px] outline-none transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                aria-label={t('searchClear')}
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showCategoryNav && (
          <nav
            aria-label="Menu categories"
            className="no-scrollbar scroll-fade-x mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-5 py-3 sm:px-8"
          >
            {visibleSpecials.length > 0 && (
              <a
                href={`#${SPECIALS_ANCHOR_ID}`}
                className="bg-pop text-pop-foreground hover:bg-pop-deep shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
              >
                Today&apos;s Specials
              </a>
            )}
            {visibleGroups.map((g, i) => (
              <a
                key={categoryIds[i]}
                href={`#${categoryIds[i]}`}
                className="bg-card text-foreground hover:bg-foreground hover:text-background shrink-0 rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors"
              >
                {g.category}
              </a>
            ))}
          </nav>
        )}
        {!showCategoryNav && <div className="h-3" aria-hidden="true" />}
      </div>

      {/* Items */}
      <main className="mx-auto max-w-[720px] px-5 sm:px-8">
        {visibleSpecials.length > 0 && (
          <section
            id={SPECIALS_ANCHOR_ID}
            className="border-pop/30 bg-pop/5 scroll-mt-40 mt-6 rounded-[20px] border p-6 sm:p-8"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-pop text-[11px] font-semibold tracking-[0.18em] uppercase">
                Today&apos;s Specials
              </h2>
              <span className="text-muted-foreground text-xs">
                {visibleSpecials.length}
              </span>
            </div>
            <ul className="mt-5 space-y-6">{visibleSpecials.map(renderItem)}</ul>
          </section>
        )}
        {visibleGroups.length === 0 && visibleSpecials.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-foreground text-lg font-semibold tracking-[-0.01em]">
              {t('noResults', { query: query.trim() })}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">{t('noResultsHint')}</p>
          </div>
        ) : (
          visibleGroups.map((g, i) => (
            <section
              key={categoryIds[i]}
              id={categoryIds[i]}
              className="border-cream-line scroll-mt-40 border-b py-8 last:border-b-0 sm:py-10"
            >
              <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                {g.category}
              </h2>
              <ul className="mt-5 space-y-6">{g.items.map(renderItem)}</ul>
            </section>
          ))
        )}
        {hasQuery && (visibleGroups.length > 0 || visibleSpecials.length > 0) && (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {totalMatches === 1 ? '1 match' : `${totalMatches} matches`}
          </p>
        )}
      </main>
    </>
  )
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}
