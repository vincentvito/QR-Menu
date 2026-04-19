'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { currencySymbol } from '@/lib/menus/currency'
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
    name: string
    currency: string
    items: EditorItem[]
  }
}

type SaveState = 'saving' | 'saved' | 'error'
type SaveStatus = { state: SaveState; error?: string }
type Saves = Record<string, SaveStatus>

const ALL = '__all__'
const MENU_KEY = '__menu__'

export function MenuEditor({ slug, initial }: MenuEditorProps) {
  const t = useTranslations('Editor')
  const [menuName, setMenuName] = useState(initial.name)
  const [items, setItems] = useState<EditorItem[]>(initial.items)
  // Currency comes from the organization and is fixed at the menu level.
  // The symbol drives price rendering; if we ever add per-menu overrides,
  // this becomes state again.
  const symbol = currencySymbol(initial.currency)
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null)
  // Per-target save state so indicators live next to the thing that's
  // actually saving (the edited row, or the menu-name field) instead of a
  // single global badge that had to be re-homed in the toolbar.
  const [saves, setSaves] = useState<Saves>({})
  const savedTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Latest items snapshot, read from inside stable callbacks so they don't
  // have to close over `items` (which would bust useCallback's dep cache and
  // defeat ItemRow memoization). Updated after commit via useEffect.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

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

  useEffect(() => {
    const timers = savedTimers.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  const setSaveFor = useCallback((key: string, status: SaveStatus | null) => {
    setSaves((prev) => {
      if (status === null) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: status }
    })
  }, [])

  const flashSavedFor = useCallback(
    (key: string) => {
      setSaveFor(key, { state: 'saved' })
      const existing = savedTimers.current.get(key)
      if (existing) clearTimeout(existing)
      savedTimers.current.set(
        key,
        setTimeout(() => {
          setSaveFor(key, null)
          savedTimers.current.delete(key)
        }, 2100),
      )
    },
    [setSaveFor],
  )

  const handleErrorFor = useCallback(
    (key: string, err: unknown, fallback: string) => {
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : fallback
      setSaveFor(key, { state: 'error', error: message || fallback })
    },
    [setSaveFor],
  )

  const saveMenu = useCallback(
    async (patch: { name?: string }) => {
      setSaveFor(MENU_KEY, { state: 'saving' })
      try {
        const res = await fetch(`/api/menus/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? t('saveError'))
        flashSavedFor(MENU_KEY)
      } catch (err) {
        handleErrorFor(MENU_KEY, err, t('saveError'))
      }
    },
    [slug, setSaveFor, flashSavedFor, handleErrorFor, t],
  )

  // Stable callback: reads "previous" from itemsRef and owns the optimistic
  // update so the render-site handler doesn't have to close over `items`.
  const saveItem = useCallback(
    async (
      id: string,
      patch: { name?: string; description?: string; price?: number; category?: string },
    ) => {
      const previous = itemsRef.current.find((it) => it.id === id)
      if (!previous) return
      setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)))
      setSaveFor(id, { state: 'saving' })
      try {
        const res = await fetch(`/api/menus/${slug}/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? t('saveError'))
        flashSavedFor(id)
      } catch (err) {
        setItems((cur) => cur.map((it) => (it.id === id ? previous : it)))
        handleErrorFor(id, err, t('saveError'))
      }
    },
    [slug, setSaveFor, flashSavedFor, handleErrorFor, t],
  )

  const addItem = useCallback(async (
    category: string,
    fields: { name: string; description?: string; price?: number },
  ) => {
    // Adds have no row to anchor to until the server returns an id, so the
    // DraftItemForm's own submitting state handles the progress UI and we
    // surface failures via a toast instead.
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
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : t('saveError')
      toast.error(message || t('saveError'))
      return false
    }
  }, [slug, t])

  const deleteItem = useCallback(async (id: string) => {
    // Confirmation now happens inline in ItemRow — arrive here only after
    // the user has clicked the destructive button a second time. The row is
    // optimistically removed; on failure we restore it and anchor the error
    // indicator back onto the restored row.
    const previous = itemsRef.current
    setItems((cur) => cur.filter((it) => it.id !== id))
    try {
      const res = await fetch(`/api/menus/${slug}/items/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? t('saveError'))
      }
      // Success: row vanishing is feedback enough; no indicator needed.
      setSaveFor(id, null)
    } catch (err) {
      setItems(previous)
      handleErrorFor(id, err, t('saveError'))
    }
  }, [slug, setSaveFor, handleErrorFor, t])

  const liveMessage = useMemo(() => {
    const values = Object.values(saves)
    const err = values.find((v) => v.state === 'error')
    if (err) return err.error ?? t('saveError')
    if (values.some((v) => v.state === 'saving')) return t('saving')
    if (values.some((v) => v.state === 'saved')) return t('saved')
    return ''
  }, [saves, t])

  return (
    <div>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <div className="lg:flex lg:gap-10">
        {/* Sidebar: settings + category rail. ScrollArea caps height so very
            long category lists scroll internally instead of pushing the viewport. */}
        <aside className="lg:w-[280px] lg:flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <MenuSettingsCard
              menuName={menuName}
              initialName={initial.name}
              save={saves[MENU_KEY]}
              onNameChange={setMenuName}
              onNameBlur={() => {
                const trimmed = menuName.trim()
                if (trimmed && trimmed !== initial.name) {
                  saveMenu({ name: trimmed })
                }
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
            <CategoryChip
              active={selectedCategory === ALL}
              Icon={LayoutGrid}
              label={t('allCategory')}
              count={items.length}
              onClick={() => setSelectedCategory(ALL)}
            />
            {categories.map((cat) => {
              const Icon = categoryIcon(cat.name)
              return (
                <CategoryChip
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

          {/* Toolbar: search only. "Add dish" lives inside each category section
              so the action is always contextual. Save status is anchored on the
              item card being edited, not here, so the search bar doesn't resize
              when an autosave fires. */}
          <div className="bg-background/90 sticky top-[65px] z-10 mb-6 py-3 backdrop-blur-md lg:top-[77px]">
            <div className="relative">
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
                          save={saves[item.id]}
                          onChange={saveItem}
                          onDelete={deleteItem}
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
  menuName,
  initialName,
  save,
  onNameChange,
  onNameBlur,
}: {
  menuName: string
  initialName: string
  save: SaveStatus | undefined
  onNameChange: (v: string) => void
  onNameBlur: () => void
}) {
  const t = useTranslations('Editor')
  return (
    <div className="border-cream-line bg-card rounded-[20px] border p-5">
      <label className="block space-y-1.5">
        <div className="flex min-h-[28px] items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t('menuNameLabel')}
          </span>
          <SaveIndicator save={save} />
        </div>
        <input
          type="text"
          value={menuName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameBlur}
          data-initial={initialName}
          className="border-transparent focus:border-foreground/30 focus:bg-background w-full rounded-md border bg-transparent px-2 py-1.5 text-lg font-semibold tracking-[-0.01em] outline-none"
        />
      </label>
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

function CategoryChip({
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
          <PillButton
            type="button"
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t('newDishSave')}
          </PillButton>
        </div>
      </div>
    </li>
  )
}

const ItemRow = memo(function ItemRow({
  item,
  isFirst,
  symbol,
  save,
  onChange,
  onDelete,
}: {
  item: EditorItem
  isFirst: boolean
  symbol: string
  save: SaveStatus | undefined
  onChange: (
    id: string,
    patch: { name?: string; description?: string; price?: number },
  ) => void
  onDelete: (id: string) => void
}) {
  const t = useTranslations('Editor')
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
              if (trimmed !== item.name) onChange(item.id, { name: trimmed })
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
                  onChange(item.id, { price: parsed })
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
            if (localDesc !== item.description) onChange(item.id, { description: localDesc })
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
        {/* Reserved slot so showing/hiding the pill doesn't push the row's
            height around. Height matches the pill (px-2.5 py-1 + 1px border). */}
        <div className="flex min-h-[28px] items-center justify-end px-2 pt-0.5">
          <SaveIndicator save={save} />
        </div>
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
              onDelete(item.id)
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
})

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

function SaveIndicator({ save }: { save: SaveStatus | undefined }) {
  const t = useTranslations('Editor')
  if (!save) return null

  const base =
    'relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium'

  if (save.state === 'saving') {
    return (
      <span
        key="saving"
        className={`${base} border-cream-line bg-card text-muted-foreground animate-save-pill-in`}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {t('saving')}
      </span>
    )
  }
  if (save.state === 'saved') {
    return (
      <span
        key="saved"
        className={`${base} animate-save-pill-saved border-emerald-500/40 bg-emerald-500/10 text-emerald-700`}
      >
        {/* Light sweep — runs once over the pill as it holds, then fades. */}
        <span
          aria-hidden="true"
          className="animate-save-pill-wave pointer-events-none absolute inset-y-0 -inset-x-2 bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.7)_50%,transparent_100%)]"
        />
        <Check className="relative h-3 w-3" aria-hidden="true" />
        <span className="relative">{t('saved')}</span>
      </span>
    )
  }
  return (
    <span
      key="error"
      role="alert"
      className={`${base} border-destructive/40 bg-destructive/10 text-destructive animate-save-pill-in`}
    >
      {save.error || t('saveError')}
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
