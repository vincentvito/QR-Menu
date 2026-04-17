'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Check,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CURRENCIES,
  type CurrencyCode,
  currencySymbol,
  isSupportedCurrency,
} from '@/lib/menus/currency'
import { categoryIcon } from '@/lib/menus/category-icon'

interface EditorItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  tags: string[]
}

interface MenuEditorProps {
  slug: string
  initial: {
    restaurantName: string
    currency: string
    items: EditorItem[]
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const ALL = '__all__'

export function MenuEditor({ slug, initial }: MenuEditorProps) {
  const t = useTranslations('Editor')
  const [restaurantName, setRestaurantName] = useState(initial.restaurantName)
  const [currency, setCurrency] = useState<CurrencyCode>(
    isSupportedCurrency(initial.currency) ? initial.currency : 'USD',
  )
  const [items, setItems] = useState<EditorItem[]>(initial.items)
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Order categories by their first-seen position in the items list, so
  // re-renders after edits don't shuffle the rail.
  const categories = useMemo(() => {
    const order: string[] = []
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = item.category || 'Other'
      if (!counts.has(key)) order.push(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return order.map((name) => ({ name, count: counts.get(name) ?? 0 }))
  }, [items])

  const symbol = currencySymbol(currency)

  // Visible items = category filter ∩ search query.
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter((it) => {
      if (selectedCategory !== ALL && (it.category || 'Other') !== selectedCategory) {
        return false
      }
      if (q) {
        const hay =
          it.name.toLowerCase() +
          ' ' +
          it.description.toLowerCase() +
          ' ' +
          it.tags.join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const order: string[] = []
    const groups = new Map<string, EditorItem[]>()
    for (const item of filtered) {
      const key = item.category || 'Other'
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      groups.get(key)!.push(item)
    }
    return order.map((name) => ({ name, items: groups.get(name)! }))
  }, [items, selectedCategory, query])

  const hasQuery = query.trim().length > 0

  const flashSaved = useCallback(() => {
    setSaveState('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => {
      setSaveState((s) => (s === 'saved' ? 'idle' : s))
    }, 1200)
  }, [])

  const handleError = useCallback((err: unknown, fallback: string) => {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : fallback
    setError(message || fallback)
    setSaveState('error')
  }, [])

  async function saveMenu(patch: { restaurantName?: string; currency?: CurrencyCode }) {
    setSaveState('saving')
    setError('')
    try {
      const res = await fetch(`/api/menus/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('saveError'))
      flashSaved()
    } catch (err) {
      handleError(err, t('saveError'))
    }
  }

  async function saveItem(
    id: string,
    patch: { name?: string; description?: string; price?: number; category?: string },
    previous: EditorItem,
  ) {
    setSaveState('saving')
    setError('')
    try {
      const res = await fetch(`/api/menus/${slug}/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('saveError'))
      flashSaved()
    } catch (err) {
      setItems((cur) => cur.map((it) => (it.id === id ? previous : it)))
      handleError(err, t('saveError'))
    }
  }

  async function addItem(
    category: string,
    fields: { name: string; description?: string; price?: number },
  ) {
    setSaveState('saving')
    setError('')
    try {
      const res = await fetch(`/api/menus/${slug}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          name: fields.name,
          description: fields.description ?? '',
          price: fields.price ?? 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('saveError'))
      setItems((cur) => [
        ...cur,
        {
          id: data.id,
          category: data.category,
          name: data.name,
          description: data.description ?? '',
          price: data.price ?? 0,
          tags: data.tags ?? [],
        },
      ])
      flashSaved()
      return true
    } catch (err) {
      handleError(err, t('saveError'))
      return false
    }
  }

  async function deleteItem(id: string) {
    // Confirmation now happens inline in ItemRow — arrive here only after
    // the user has clicked the destructive button a second time.
    const previous = items
    setItems((cur) => cur.filter((it) => it.id !== id))
    setSaveState('saving')
    setError('')
    try {
      const res = await fetch(`/api/menus/${slug}/items/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? t('saveError'))
      }
      flashSaved()
    } catch (err) {
      setItems(previous)
      handleError(err, t('saveError'))
    }
  }

  return (
    <div>
      <div className="sr-only" aria-live="polite">
        {saveState === 'saving' && t('saving')}
        {saveState === 'saved' && t('saved')}
        {saveState === 'error' && error}
      </div>

      <div className="lg:flex lg:gap-10">
        {/* Sidebar: settings + category rail. ScrollArea caps height so very
            long category lists scroll internally instead of pushing the viewport. */}
        <aside className="lg:w-[280px] lg:flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <MenuSettingsCard
              restaurantName={restaurantName}
              currency={currency}
              initialName={initial.restaurantName}
              onNameChange={setRestaurantName}
              onNameBlur={() => {
                const trimmed = restaurantName.trim()
                if (trimmed && trimmed !== initial.restaurantName) {
                  saveMenu({ restaurantName: trimmed })
                }
              }}
              onCurrencyChange={(next) => {
                setCurrency(next)
                saveMenu({ currency: next })
              }}
            />

            {/* Desktop: vertical category rail. No ScrollArea — lets the rail
                extend naturally; `sticky` keeps it in place and the page
                scrolls underneath if it's taller than the viewport. */}
            <nav
              aria-label={t('categoriesHeading')}
              className="mt-6 hidden space-y-1 lg:block"
            >
              <RailButton
                active={selectedCategory === ALL}
                Icon={LayoutGrid}
                label={t('allCategory')}
                count={items.length}
                onClick={() => setSelectedCategory(ALL)}
                t={t}
              />
              {categories.map((cat) => {
                const Icon = categoryIcon(cat.name)
                return (
                  <RailButton
                    key={cat.name}
                    active={selectedCategory === cat.name}
                    Icon={Icon}
                    label={cat.name}
                    count={cat.count}
                    onClick={() => setSelectedCategory(cat.name)}
                    t={t}
                  />
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main column */}
        <div className="mt-6 min-w-0 flex-1 lg:mt-0">
          {/* Mobile: horizontal category pills. Hidden scrollbar + edge fade
              keep it clean without the Radix thumb. */}
          <nav
            aria-label={t('categoriesHeading')}
            className="no-scrollbar scroll-fade-x mb-4 flex gap-2 overflow-x-auto lg:hidden"
          >
            <PillButton
              active={selectedCategory === ALL}
              Icon={LayoutGrid}
              label={t('allCategory')}
              count={items.length}
              onClick={() => setSelectedCategory(ALL)}
            />
            {categories.map((cat) => {
              const Icon = categoryIcon(cat.name)
              return (
                <PillButton
                  key={cat.name}
                  active={selectedCategory === cat.name}
                  Icon={Icon}
                  label={cat.name}
                  count={cat.count}
                  onClick={() => setSelectedCategory(cat.name)}
                />
              )
            })}
          </nav>

          {/* Toolbar: search + save indicator only. "Add dish" lives inside
              each category section so the action is always contextual. */}
          <div className="bg-background/90 sticky top-[65px] z-10 mb-6 flex items-center gap-2 py-3 backdrop-blur-md lg:top-[77px]">
            <div className="relative flex-1">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="border-cream-line bg-card focus:border-foreground/40 focus:bg-background h-11 w-full rounded-full border pl-10 pr-10 text-sm outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={t('searchPlaceholder')}
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
            <SaveIndicator state={saveState} error={error} />
          </div>

          {/* Items */}
          {visibleGroups.length === 0 ? (
            <EmptyState query={query} selectedCategory={selectedCategory} t={t} />
          ) : (
            <div className="space-y-10">
              {visibleGroups.map(({ name: cat, items: rows }) => {
                const CatIcon = categoryIcon(cat)
                const isAdding = addingToCategory === cat
                return (
                  <section key={cat}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <CatIcon
                          className="text-muted-foreground h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <h2 className="text-muted-foreground truncate text-[11px] font-semibold tracking-[0.18em] uppercase">
                          {cat}
                        </h2>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          · {t('dishesCount', { count: rows.length })}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isAdding ? 'ghost' : 'outline'}
                        onClick={() =>
                          setAddingToCategory(isAdding ? null : cat)
                        }
                      >
                        {isAdding ? (
                          <>
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('newDishCancel')}
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('addDish')}
                          </>
                        )}
                      </Button>
                    </div>
                    <ul className="border-cream-line overflow-hidden rounded-[20px] border">
                      {isAdding && (
                        <DraftItemForm
                          category={cat}
                          symbol={symbol}
                          onSubmit={async (fields) => {
                            const ok = await addItem(cat, fields)
                            if (ok) setAddingToCategory(null)
                            return ok
                          }}
                          onCancel={() => setAddingToCategory(null)}
                          t={t}
                        />
                      )}
                      {rows.map((item, i) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          isFirst={i === 0 && !isAdding}
                          symbol={symbol}
                          onChange={(patch) => {
                            const previous = items.find((it) => it.id === item.id)!
                            setItems((cur) =>
                              cur.map((it) =>
                                it.id === item.id ? { ...it, ...patch } : it,
                              ),
                            )
                            saveItem(item.id, patch, previous)
                          }}
                          onDelete={() => deleteItem(item.id)}
                          t={t}
                        />
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuSettingsCard({
  restaurantName,
  currency,
  initialName,
  onNameChange,
  onNameBlur,
  onCurrencyChange,
}: {
  restaurantName: string
  currency: CurrencyCode
  initialName: string
  onNameChange: (v: string) => void
  onNameBlur: () => void
  onCurrencyChange: (next: CurrencyCode) => void
}) {
  const t = useTranslations('Editor')
  return (
    <div className="border-cream-line bg-card rounded-[20px] border p-5">
      <label className="block space-y-1.5">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          {t('restaurantNameLabel')}
        </span>
        <input
          type="text"
          value={restaurantName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameBlur}
          data-initial={initialName}
          className="border-transparent focus:border-foreground/30 focus:bg-background w-full rounded-md border bg-transparent px-2 py-1.5 text-lg font-semibold tracking-[-0.01em] outline-none"
        />
      </label>
      <div className="mt-3 space-y-1.5">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          {t('currencyLabel')}
        </span>
        <Select
          value={currency}
          onValueChange={(v) => onCurrencyChange(v as CurrencyCode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function RailButton({
  active,
  Icon,
  label,
  count,
  onClick,
  t,
}: {
  active: boolean
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  count: number
  onClick: () => void
  t: ReturnType<typeof useTranslations<'Editor'>>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition-colors ${
        active
          ? 'bg-foreground border-foreground text-background'
          : 'border-transparent text-foreground hover:bg-card'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
          active ? 'bg-accent text-accent-foreground' : 'bg-background text-foreground'
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden={true} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-[-0.01em]">
          {label}
        </span>
        <span
          className={`block truncate text-[11px] ${
            active ? 'text-background/70' : 'text-muted-foreground'
          }`}
        >
          {t('dishesCount', { count })}
        </span>
      </span>
    </button>
  )
}

function PillButton({
  active,
  Icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-foreground border-foreground text-background'
          : 'border-cream-line bg-card text-foreground hover:bg-background'
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      <span className="whitespace-nowrap">{label}</span>
      <span className={`text-xs ${active ? 'opacity-70' : 'text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  )
}

function DraftItemForm({
  category,
  symbol,
  onSubmit,
  onCancel,
  t,
}: {
  category: string
  symbol: string
  onSubmit: (fields: { name: string; description?: string; price?: number }) => Promise<boolean>
  onCancel: () => void
  t: ReturnType<typeof useTranslations<'Editor'>>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || submitting) return
    const price = parsePriceInput(priceInput) ?? 0
    setSubmitting(true)
    const ok = await onSubmit({
      name: trimmed,
      description: description.trim(),
      price,
    })
    if (!ok) setSubmitting(false)
    // On success, parent dismisses — no need to reset state here.
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      // Enter on any plain input submits. Shift+Enter / enter in the
      // description textarea falls through to normal newline behavior.
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <li className="bg-card border-accent/50 border-l-4 space-y-3 px-4 py-4" onKeyDown={handleKey}>
      <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
        {t('newDishTitle', { category })}
      </div>

      <div className="flex items-start gap-2">
        <Input
          autoFocus
          aria-label={t('newDishName')}
          placeholder={t('newDishNamePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="flex-1 text-[17px] font-semibold tracking-[-0.01em]"
        />
        <div className="bg-foreground text-accent flex shrink-0 items-center rounded-full pl-3 pr-1 text-[13px] font-semibold">
          <span>{symbol}</span>
          <input
            type="text"
            inputMode="decimal"
            aria-label={t('newDishPrice')}
            placeholder="0"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            disabled={submitting}
            className="placeholder:text-accent/60 w-14 rounded-full bg-transparent px-1 py-1 text-right tabular-nums outline-none focus:bg-background/10"
          />
        </div>
      </div>

      <Textarea
        aria-label={t('newDishDescription')}
        placeholder={t('newDishDescriptionPlaceholder')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={submitting}
        className="min-h-[60px] text-[14px]"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">{t('newDishHint')}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
            {t('newDishCancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="pillPrimary"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t('newDishSave')}
          </Button>
        </div>
      </div>
    </li>
  )
}

function ItemRow({
  item,
  isFirst,
  symbol,
  onChange,
  onDelete,
  t,
}: {
  item: EditorItem
  isFirst: boolean
  symbol: string
  onChange: (patch: { name?: string; description?: string; price?: number }) => void
  onDelete: () => void
  t: ReturnType<typeof useTranslations<'Editor'>>
}) {
  const [localName, setLocalName] = useState(item.name)
  const [localDesc, setLocalDesc] = useState(item.description)
  const [localPrice, setLocalPrice] = useState(formatPriceInput(item.price))
  const [confirming, setConfirming] = useState(false)

  return (
    <li
      className={`bg-background flex items-start gap-3 px-4 py-4 transition-colors ${
        isFirst ? '' : 'border-cream-line border-t'
      } ${confirming ? 'bg-destructive/5' : ''}`}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <input
            type="text"
            aria-label={t('itemName')}
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              const trimmed = localName.trim()
              if (!trimmed) {
                setLocalName(item.name)
                return
              }
              if (trimmed !== item.name) onChange({ name: trimmed })
            }}
            className="border-transparent focus:border-foreground/30 focus:bg-card flex-1 rounded-md border bg-transparent px-2 py-1 text-[17px] font-semibold tracking-[-0.01em] outline-none"
          />
          <div className="bg-foreground text-accent flex shrink-0 items-center rounded-full pl-3 pr-1 text-[13px] font-semibold">
            <span>{symbol}</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label={t('itemPrice')}
              value={localPrice}
              onChange={(e) => setLocalPrice(e.target.value)}
              onBlur={() => {
                const parsed = parsePriceInput(localPrice)
                if (parsed === null) {
                  setLocalPrice(formatPriceInput(item.price))
                  return
                }
                if (parsed !== item.price) {
                  onChange({ price: parsed })
                  setLocalPrice(formatPriceInput(parsed))
                }
              }}
              className="w-14 rounded-full bg-transparent px-1 py-1 text-right tabular-nums outline-none focus:bg-background/10"
            />
          </div>
        </div>
        <Textarea
          aria-label={t('itemDescription')}
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={() => {
            if (localDesc !== item.description) onChange({ description: localDesc })
          }}
          placeholder={t('itemDescription')}
          // Override shadcn defaults to look inline (transparent, no border
          // at rest) while keeping field-sizing-content auto-growth.
          className="text-muted-foreground focus-visible:bg-card focus-visible:text-foreground placeholder:text-muted-foreground/50 min-h-0 resize-none rounded-md border-transparent bg-transparent px-2 py-1 text-[14px] leading-[1.55] shadow-none md:text-[14px]"
        />
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2">
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

      {/* Inline delete confirmation — first click arms, second confirms. */}
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t('cancelDelete')}
            onClick={() => setConfirming(false)}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => {
              setConfirming(false)
              onDelete()
            }}
            className="rounded-full"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('confirmDeleteShort')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t('deleteDish')}
          onClick={() => setConfirming(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  )
}

function EmptyState({
  query,
  selectedCategory,
  t,
}: {
  query: string
  selectedCategory: string
  t: ReturnType<typeof useTranslations<'Editor'>>
}) {
  if (query.trim()) {
    return (
      <div className="border-cream-line bg-card rounded-[20px] border p-10 text-center">
        <p className="text-foreground text-lg font-semibold tracking-[-0.01em]">
          {t('noMatches', { query: query.trim() })}
        </p>
      </div>
    )
  }
  return (
    <div className="border-cream-line bg-card rounded-[20px] border p-10 text-center">
      <p className="text-muted-foreground text-sm">{t('emptyCategory')}</p>
    </div>
  )
}

function SaveIndicator({ state, error }: { state: SaveState; error: string }) {
  const t = useTranslations('Editor')
  if (state === 'idle') return null
  if (state === 'saving') {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {t('saving')}
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
        <Check className="h-3 w-3" aria-hidden="true" />
        <span className="hidden sm:inline">{t('saved')}</span>
      </span>
    )
  }
  return (
    <span role="alert" className="text-destructive text-xs">
      {error || t('saveError')}
    </span>
  )
}

function formatPriceInput(n: number): string {
  if (n <= 0) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function parsePriceInput(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return 0
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
