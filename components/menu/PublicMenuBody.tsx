'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { ImageLightbox } from '@/components/menu/ImageLightbox'
import { getTemplate } from '@/components/menu/templates'
import type {
  TemplateCategoryGroup,
  TemplateItem,
} from '@/components/menu/templates/types'

interface PublicMenuBodyProps {
  items: TemplateItem[]
  // IDs of items that are currently on special. Resolved against `items`
  // client-side so we don't serialize the same dish twice.
  specialIds: string[]
  symbol: string
  // Which template to render. Falls back to default if unknown.
  templateId: string
}

const SPECIALS_ANCHOR_ID = 'todays-specials'

// PublicMenuBody owns the chrome: sticky search, category nav, lightbox,
// empty states. Item rendering is delegated to the selected template so
// each layout (Editorial, Photo Grid, etc.) can diverge without
// reimplementing search/scroll logic.
export function PublicMenuBody({
  items,
  specialIds,
  symbol,
  templateId,
}: PublicMenuBodyProps) {
  const t = useTranslations('MenuView')
  const [query, setQuery] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const { visibleGroups, visibleSpecials, totalMatches, hasQuery } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (it: TemplateItem) => {
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

    const order: string[] = []
    const groupsMap = new Map<string, TemplateItem[]>()
    for (const item of filtered) {
      const key = item.category || 'Other'
      if (!groupsMap.has(key)) {
        groupsMap.set(key, [])
        order.push(key)
      }
      groupsMap.get(key)!.push(item)
    }

    const groups: TemplateCategoryGroup[] = order.map((category, i) => ({
      id: `cat-${i}-${slugId(category)}`,
      category,
      items: groupsMap.get(category)!,
    }))

    return {
      visibleGroups: groups,
      visibleSpecials: filteredSpecials,
      totalMatches: filtered.length,
      hasQuery: q.length > 0,
    }
  }, [items, specialIds, query])

  const template = getTemplate(templateId)
  const showCategoryNav =
    !hasQuery && (visibleSpecials.length > 0 || visibleGroups.length > 1)
  const nothingToShow = visibleGroups.length === 0 && visibleSpecials.length === 0

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
            {visibleGroups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="bg-card text-foreground hover:bg-foreground hover:text-background shrink-0 rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors"
              >
                {g.category}
              </a>
            ))}
          </nav>
        )}
        {!showCategoryNav && <div className="h-3" aria-hidden="true" />}
      </div>

      {/* Items — delegated to the chosen template */}
      <main className="mx-auto max-w-[720px] px-5 sm:px-8">
        {nothingToShow ? (
          <div className="py-16 text-center">
            <p className="text-foreground text-lg font-semibold tracking-[-0.01em]">
              {t('noResults', { query: query.trim() })}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">{t('noResultsHint')}</p>
          </div>
        ) : (
          <template.Body
            groups={visibleGroups}
            specials={visibleSpecials}
            specialsAnchorId={SPECIALS_ANCHOR_ID}
            symbol={symbol}
            onOpenImage={setLightboxSrc}
          />
        )}
        {hasQuery && !nothingToShow && (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {totalMatches === 1 ? '1 match' : `${totalMatches} matches`}
          </p>
        )}
      </main>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}

function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}
